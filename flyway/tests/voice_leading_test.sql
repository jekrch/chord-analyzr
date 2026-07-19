-- Regression tests for the voice-leading functions in
-- flyway/sql/views/R__voice_leading.sql. Design notes: docs/voice-leading-design.md
--
-- Run against a migrated database:
--
--   docker compose exec -T postgres psql -U postgres -d chordanalyzr \
--       -v ON_ERROR_STOP=1 -f - < flyway/tests/voice_leading_test.sql
--
-- Every progression call uses p_randomness = 0. Exact chord sequences can
-- legitimately change when equal-cost ties are broken differently, so the
-- assertions pin down costs and structure, not the winning chord names.
-- This file lives outside flyway/sql on purpose: it is a test, not a migration.

\set ON_ERROR_STOP on

-- distance functions: exact known values
DO $$
BEGIN
    ASSERT fn_pitch_class_distance(1, 12) = 1, 'C to B is one semitone';
    ASSERT fn_pitch_class_distance(1, 7)  = 6, 'C to F# is a tritone';
    ASSERT fn_pitch_class_distance(3, 3)  = 0, 'unison is zero';

    ASSERT fn_root_motion_penalty(1, 6) = 0, 'down a fifth is the strongest move';
    ASSERT fn_root_motion_penalty(1, 8) = 3, 'up a fifth is a retrogression';
    ASSERT fn_root_motion_penalty(1, 1) = 4, 'same root is the weakest';

    -- motion profiles: each rewards a different interval family; an unknown
    -- profile name falls back to 'functional'
    ASSERT fn_root_motion_penalty(1, 4, 'mediant') = 0, 'mediant: a third is the strongest move';
    ASSERT fn_root_motion_penalty(1, 6, 'mediant') = 2, 'mediant: a fifth is mid-cost';
    ASSERT fn_root_motion_penalty(1, 3, 'mediant') = 3, 'mediant: a step is expensive';
    ASSERT fn_root_motion_penalty(1, 2, 'stepwise') = 0, 'stepwise: a semitone is the strongest move';
    ASSERT fn_root_motion_penalty(1, 8, 'stepwise') = 3, 'stepwise: a fifth is expensive';
    ASSERT fn_root_motion_penalty(1, 3, 'static') = fn_pitch_class_distance(1, 3),
        'static: penalty is the raw pitch-class distance';
    ASSERT fn_root_motion_penalty(1, 6, 'zzz') = fn_root_motion_penalty(1, 6, 'functional'),
        'unknown motion profile should fall back to functional';

    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[5,8,12]) = 1, 'C to Em';
    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[10,1,5]) = 2, 'C to Am';
    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[9,1,4])  = 2, 'C to Ab';
    ASSERT fn_voice_leading_distance(ARRAY[6,10,1], ARRAY[8,12,3]) = 5, 'F to G';
    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[1,5,8])  = 0, 'same set is zero';
    RAISE NOTICE 'ok: distance functions';
END $$;

-- circle-of-fifths brightness: known positions relative to tonic C (pitch
-- class 1), and a chord's brightness as the mean of its notes' positions
DO $$
BEGIN
    ASSERT fn_circle_of_fifths_position(1, 1) = 0,  'C relative to C is the tonic, position 0';
    ASSERT fn_circle_of_fifths_position(8, 1) = 1,  'G is one fifth sharp of C';
    ASSERT fn_circle_of_fifths_position(6, 1) = -1, 'F is one fifth flat of C';
    ASSERT fn_circle_of_fifths_position(7, 1) = 6,  'F# sits at the far (tritone) edge';
    ASSERT fn_circle_of_fifths_position(2, 1) = -5, 'Db sits five fifths flat of C';

    ASSERT ROUND(fn_chord_brightness(ARRAY[1,5,8], 1), 4) = 1.6667,
        'C major (C,E,G) brightness relative to C';
    ASSERT ROUND(fn_chord_brightness(ARRAY[6,10,1], 1), 4) = 0.6667,
        'F major (F,A,C) is darker than C major relative to the same tonic';
    RAISE NOTICE 'ok: circle-of-fifths brightness';
END $$;

-- graph views: C Ionian has 102 canonical chords and no zero-distance edges
DO $$
DECLARE
    v_nodes integer;
    v_edges integer;
    v_min   integer;
BEGIN
    SELECT count(*) INTO v_nodes
    FROM mode_key_chord_view WHERE mode = 'Ionian' AND key_name = 'C';
    ASSERT v_nodes = 102, format('expected 102 C Ionian chords, got %s', v_nodes);

    SELECT count(*), min(vl_distance) INTO v_edges, v_min
    FROM mode_key_chord_edge_view WHERE mode = 'Ionian' AND key_name = 'C';
    ASSERT v_edges = 10180, format('expected 10180 C Ionian edges, got %s', v_edges);
    ASSERT v_min = 1, 'zero-distance edges must not appear in the edge view';
    RAISE NOTICE 'ok: graph views';
END $$;

-- shared checks for one progression call, run below with various knobs.
-- Verifies: row count, start chord, per-step costs summing to the reported
-- total, the expected total, and no repeated chord names.
CREATE OR REPLACE FUNCTION _test_progression(
    label text, expect_len integer, expect_cost integer,
    p_mode text, p_key text, p_start text, p_len integer,
    p_root numeric DEFAULT 0, p_slash numeric DEFAULT 0,
    p_extra text[] DEFAULT '{}',
    p_pin_chords text[] DEFAULT '{}', p_pin_pos integer[] DEFAULT '{}',
    p_max integer DEFAULT 0,
    p_req_notes text[] DEFAULT '{}', p_req_pos integer[] DEFAULT '{}',
    p_color numeric DEFAULT 0, p_devices text[] DEFAULT '{}',
    p_ending text DEFAULT NULL, p_loop numeric DEFAULT 0,
    p_bright numeric DEFAULT NULL, p_avoid text[] DEFAULT '{}',
    p_motion text DEFAULT 'functional',
    p_bass text[] DEFAULT '{}', p_bass_pos integer[] DEFAULT '{}',
    p_min integer DEFAULT 0
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_rows  integer;
    v_first text;
    v_sum   integer;
    v_total integer;
    v_names integer;
BEGIN
    DROP TABLE IF EXISTS _test_result;
    CREATE TEMP TABLE _test_result AS
        SELECT * FROM fn_smooth_progression(
            p_mode, p_key, p_start, p_len, 0, p_extra, p_root, p_slash,
            p_pin_chords, p_pin_pos, p_max, p_req_notes, p_req_pos,
            1, p_color, p_devices, p_ending, p_loop, p_bright, p_avoid, p_motion,
            p_bass, p_bass_pos, p_min);

    SELECT count(*), sum(vl_from_prev), max(total_cost),
           count(DISTINCT chord)
    INTO v_rows, v_sum, v_total, v_names
    FROM _test_result;
    SELECT chord INTO v_first FROM _test_result WHERE step = 1;

    ASSERT (SELECT bool_and(progression_id = 1) FROM _test_result),
        format('%s: default result_count must yield a single progression id 1', label);
    ASSERT v_rows = expect_len,
        format('%s: expected %s rows, got %s', label, expect_len, v_rows);
    ASSERT v_first = p_start,
        format('%s: expected to start on %s, got %s', label, p_start, v_first);
    ASSERT v_sum = v_total,
        format('%s: step costs sum to %s but total_cost says %s', label, v_sum, v_total);
    -- a NULL expected cost skips the exact-cost check (the winning cost is
    -- still pinned down as the sum of its per-step costs above)
    ASSERT expect_cost IS NULL OR v_total = expect_cost,
        format('%s: expected total cost %s, got %s', label, expect_cost, v_total);
    ASSERT v_names = v_rows,
        format('%s: a chord repeats within the progression', label);
    RAISE NOTICE 'ok: %', label;
END $$;

SELECT _test_progression('plain 4-chord',   4, 4, 'Ionian', 'C', 'Cmaj7', 4);
SELECT _test_progression('root weight 2',   4, 5, 'Ionian', 'C', 'Cmaj7', 4, p_root => 2);
SELECT _test_progression('dorian 5-chord',  5, 4, 'Dorian', 'D', 'Dm7',   5);
SELECT _test_progression('out-of-scale start', 4, 3, 'Ionian', 'C', 'E7', 4);

-- slash weight: expected cost, plus at least one inverted chord in the output
DO $$
BEGIN
    PERFORM _test_progression('slash weight 2', 5, 7, 'Ionian', 'C', 'Cmaj7', 5,
                              p_root => 2, p_slash => 2);
    ASSERT EXISTS (SELECT 1 FROM _test_result WHERE step > 1 AND chord LIKE '%/%'),
        'slash weight 2: expected at least one slash voicing';
    RAISE NOTICE 'ok: slash voicing appears';
END $$;

-- extra notes: some chord must actually use the borrowed note (F# = pitch class 7)
DO $$
BEGIN
    PERFORM _test_progression('extra note F#', 4, 4, 'Ionian', 'C', 'Cmaj7', 4,
                              p_extra => ARRAY['F#']);
    ASSERT EXISTS (
        SELECT 1
        FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE 7 = ANY (cv.chord_note_array)),
        'extra note F#: no chord in the result uses F#';
    RAISE NOTICE 'ok: borrowed note lands';
END $$;

-- pins: G7 fixed at step 3, Am7 floating but present
DO $$
BEGIN
    PERFORM _test_progression('pinned Am7 + G7@3', 4, 7, 'Ionian', 'C', 'Cmaj7', 4,
                              p_pin_chords => ARRAY['Am7','G7'],
                              p_pin_pos    => ARRAY[NULL,3]);
    ASSERT (SELECT chord FROM _test_result WHERE step = 3) = 'G7',
        'pinned: G7 is not at step 3';
    ASSERT EXISTS (SELECT 1 FROM _test_result WHERE chord = 'Am7'),
        'pinned: floating Am7 was not placed';
    RAISE NOTICE 'ok: pins placed';
END $$;

-- max notes: with the cap at 3 and no randomness, every chord the search
-- picks stays within it; the start chord is exempt even when it is bigger
DO $$
BEGIN
    PERFORM _test_progression('max notes 3', 4, 4, 'Ionian', 'C', 'Cmaj7', 4,
                              p_max => 3);
    ASSERT NOT EXISTS (
        SELECT 1
        FROM _test_result r
        JOIN fn_mode_key_chord_set('Ionian', 'C') c ON c.chord_name = r.chord
        WHERE r.step > 1 AND cardinality(c.chord_notes) > 3),
        'max notes 3: a picked chord exceeds the cap';
    RAISE NOTICE 'ok: max notes capped, start chord exempt';
END $$;

-- required notes: the chord at the given step must contain them
DO $$
BEGIN
    -- in-scale: A (pitch class 10) at step 3
    PERFORM _test_progression('required A@3', 4, 4, 'Ionian', 'C', 'Cmaj7', 4,
                              p_req_notes => ARRAY['A'], p_req_pos => ARRAY[3]);
    ASSERT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE r.step = 3 AND 10 = ANY (cv.chord_note_array)),
        'required A@3: the chord at step 3 does not contain A';

    -- two notes on one step: D and F (3 and 6) at step 2
    PERFORM _test_progression('required D+F@2', 4, 6, 'Ionian', 'C', 'Cmaj7', 4,
                              p_req_notes => ARRAY['D','F'], p_req_pos => ARRAY[2,2]);
    ASSERT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE r.step = 2 AND 3 = ANY (cv.chord_note_array)
                         AND 6 = ANY (cv.chord_note_array)),
        'required D+F@2: the chord at step 2 does not contain both D and F';
    RAISE NOTICE 'ok: required notes land';
END $$;

-- an out-of-scale required note is borrowed at its step and nowhere else
DO $$
BEGIN
    PERFORM _test_progression('required Eb@3', 4, 3, 'Ionian', 'C', 'Cmaj7', 4,
                              p_req_notes => ARRAY['Eb'], p_req_pos => ARRAY[3]);
    ASSERT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE r.step = 3 AND 4 = ANY (cv.chord_note_array)),
        'required Eb@3: the chord at step 3 does not contain Eb';
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE r.step <> 3
          AND EXISTS (SELECT 1 FROM unnest(cv.chord_note_array) cn
                      WHERE cn <> ALL (ARRAY[1,3,5,6,8,10,12]))),
        'required Eb@3: a chord at another step left the scale';
    RAISE NOTICE 'ok: out-of-scale requirement stays confined';
END $$;

-- a requirement on a pinned step gives way to the pin
DO $$
BEGIN
    PERFORM _test_progression('required vs pin', 4, 5, 'Ionian', 'C', 'Cmaj7', 4,
                              p_pin_chords => ARRAY['G7'], p_pin_pos => ARRAY[3],
                              p_req_notes  => ARRAY['Eb'], p_req_pos => ARRAY[3]);
    ASSERT (SELECT chord FROM _test_result WHERE step = 3) = 'G7',
        'required vs pin: the pin should win the step';
    RAISE NOTICE 'ok: pin beats requirement';
END $$;

-- min notes: with the floor at 4 and no randomness, every chord the search
-- picks has at least 4 notes; the start chord (a bare triad) is exempt
DO $$
BEGIN
    PERFORM _test_progression('min notes 4', 4, NULL, 'Ionian', 'C', 'C', 4,
                              p_min => 4);
    ASSERT NOT EXISTS (
        SELECT 1
        FROM _test_result r
        JOIN fn_mode_key_chord_set('Ionian', 'C') c ON c.chord_name = r.chord
        WHERE r.step > 1 AND cardinality(c.chord_notes) < 4),
        'min notes 4: a picked chord is under the floor';
    ASSERT (SELECT chord FROM _test_result WHERE step = 1) = 'C',
        'min notes 4: the start chord (a triad) should still be honored';
    RAISE NOTICE 'ok: min notes floored, start chord exempt';
END $$;

-- min notes + randomness: the floor is loose, like the cap -- a waiver lets
-- lean chords through, so across a handful of random runs one should appear
DO $$
DECLARE
    v_escaped boolean := false;
BEGIN
    FOR i IN 1..12 LOOP
        IF EXISTS (
            SELECT 1
            FROM fn_smooth_progression('Ionian','C','Cmaj7',4, 1.0,
                                       p_min_notes => 4) p
            JOIN fn_mode_key_chord_set('Ionian', 'C') c ON c.chord_name = p.chord
            WHERE p.step > 1 AND cardinality(c.chord_notes) < 4
        ) THEN
            v_escaped := true;
            EXIT;
        END IF;
    END LOOP;
    ASSERT v_escaped, 'min notes + randomness: floor never gave way in 12 runs';
    RAISE NOTICE 'ok: randomness escapes the floor';
END $$;

-- bass notes: the chord at the step sounds the required bass -- rooted on it
-- or voiced over it as a slash chord, with no slash weight needed
DO $$
DECLARE
    v_chord text;
BEGIN
    PERFORM _test_progression('bass E@2', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_bass => ARRAY['E'], p_bass_pos => ARRAY[2]);
    SELECT chord INTO v_chord FROM _test_result WHERE step = 2;
    ASSERT v_chord LIKE '%/E' OR EXISTS (
        SELECT 1 FROM fn_mode_key_chord_set('Ionian', 'C') c
        WHERE c.chord_name = v_chord AND c.root_note = 5),
        format('bass E@2: step 2 chord %s does not have E in the bass', v_chord);
    -- without slash weight, every other step stays in root position
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result WHERE step <> 2 AND chord LIKE '%/%'),
        'bass E@2: a step without a bass requirement got a slash voicing';
    RAISE NOTICE 'ok: required bass lands';
END $$;

-- pedal bass: the same bass at every later step. The start chord owns the C
-- root, so each later step must be a slash voicing over C -- and the repeated
-- bass is allowed because the caller asked for it (free steps never repeat)
DO $$
BEGIN
    PERFORM _test_progression('pedal bass C', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_bass => ARRAY['C','C','C'], p_bass_pos => ARRAY[2,3,4]);
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result WHERE step > 1 AND chord NOT LIKE '%/C'),
        'pedal bass C: a later step is not voiced over C';
    RAISE NOTICE 'ok: pedal bass repeats the caller''s note';
END $$;

-- an out-of-scale bass is borrowed at its step (as a chord tone and in the
-- bass) and nowhere else
DO $$
BEGIN
    PERFORM _test_progression('bass Eb@3', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_bass => ARRAY['Eb'], p_bass_pos => ARRAY[3]);
    ASSERT (SELECT chord FROM _test_result WHERE step = 3) LIKE '%/Eb',
        'bass Eb@3: the chord at step 3 is not voiced over Eb';
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = split_part(r.chord, '/', 1)
        WHERE r.step <> 3
          AND EXISTS (SELECT 1 FROM unnest(cv.chord_note_array) cn
                      WHERE cn <> ALL (ARRAY[1,3,5,6,8,10,12]))),
        'bass Eb@3: a chord at another step left the scale';
    RAISE NOTICE 'ok: out-of-scale bass stays confined';
END $$;

-- a bass requirement on a pinned step gives way to the pin, like required notes
DO $$
BEGIN
    PERFORM _test_progression('bass vs pin', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_pin_chords => ARRAY['G7'], p_pin_pos => ARRAY[3],
                              p_bass => ARRAY['E'], p_bass_pos => ARRAY[3]);
    ASSERT (SELECT chord FROM _test_result WHERE step = 3) = 'G7',
        'bass vs pin: the pin should win the step';
    RAISE NOTICE 'ok: pin beats bass requirement';
END $$;

-- max notes + randomness: the cap is loose -- a waiver lets oversized chords
-- through, so across a handful of random runs at least one should appear.
-- (At full randomness an escape shows up in ~19 of 20 runs, so 12 misses in
-- a row would be a one-in-many-billions fluke.)
DO $$
DECLARE
    v_escaped boolean := false;
BEGIN
    FOR i IN 1..12 LOOP
        IF EXISTS (
            SELECT 1
            FROM fn_smooth_progression('Ionian','C','C',4, 1.0,'{}',0,0,'{}','{}', 3) p
            JOIN fn_mode_key_chord_set('Ionian', 'C') c ON c.chord_name = p.chord
            WHERE p.step > 1 AND cardinality(c.chord_notes) > 3
        ) THEN
            v_escaped := true;
            EXIT;
        END IF;
    END LOOP;
    ASSERT v_escaped, 'max notes + randomness: cap never gave way in 12 runs';
    RAISE NOTICE 'ok: randomness escapes the cap';
END $$;

-- result count: k complete, distinct progressions, best first
DO $$
DECLARE
    v_ids integer;
BEGIN
    DROP TABLE IF EXISTS _test_result;
    CREATE TEMP TABLE _test_result AS
        SELECT * FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            0,'{}',0,0,'{}','{}',0,'{}','{}', 3);

    SELECT count(DISTINCT progression_id) INTO v_ids FROM _test_result;
    ASSERT v_ids = 3, format('result count 3: expected 3 progressions, got %s', v_ids);

    -- each progression is complete and starts on the start chord
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result GROUP BY progression_id
        HAVING count(*) <> 4 OR min(step) <> 1 OR max(step) <> 4),
        'result count 3: a progression is incomplete';
    ASSERT NOT EXISTS (SELECT 1 FROM _test_result WHERE step = 1 AND chord <> 'Cmaj7'),
        'result count 3: a progression does not start on the start chord';

    -- each progression's step costs sum to its own total
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result GROUP BY progression_id
        HAVING sum(vl_from_prev) <> max(total_cost)),
        'result count 3: step costs do not sum to the progression total';

    -- the progressions are distinct chord sequences
    ASSERT (SELECT count(DISTINCT seq) FROM (
                SELECT array_agg(chord ORDER BY step) AS seq
                FROM _test_result GROUP BY progression_id) s) = 3,
        'result count 3: progressions are not distinct chord sequences';

    -- best first: with every knob off the score is the cost, so totals
    -- must be non-decreasing over progression_id
    ASSERT NOT EXISTS (
        SELECT 1
        FROM (SELECT progression_id, max(total_cost) AS cost
              FROM _test_result GROUP BY progression_id) a
        JOIN (SELECT progression_id, max(total_cost) AS cost
              FROM _test_result GROUP BY progression_id) b
          ON b.progression_id = a.progression_id + 1
        WHERE b.cost < a.cost),
        'result count 3: progressions are not ordered best-first';

    -- progression 1 matches the default single result
    ASSERT (SELECT max(total_cost) FROM _test_result WHERE progression_id = 1) = 4,
        'result count 3: the best progression differs from the default result';
    RAISE NOTICE 'ok: result count returns distinct ranked progressions';
END $$;

-- result count + extra notes: the best result still carries the color, and
-- ids stay contiguous even when more results are asked for than exist
DO $$
DECLARE
    v_ids integer;
    v_max integer;
BEGIN
    DROP TABLE IF EXISTS _test_result;
    CREATE TEMP TABLE _test_result AS
        SELECT * FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            0, ARRAY['F#'], 0,0,'{}','{}',0,'{}','{}', 5);

    ASSERT EXISTS (
        SELECT 1
        FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE r.progression_id = 1 AND 7 = ANY (cv.chord_note_array)),
        'result count + extras: the best progression does not use F#';

    SELECT count(DISTINCT progression_id), max(progression_id)
    INTO v_ids, v_max FROM _test_result;
    ASSERT v_ids = 5 AND v_max = 5,
        'result count + extras: expected 5 contiguous progression ids';
    RAISE NOTICE 'ok: result count composes with extra notes';
END $$;

-- borrowed roots: the color node set for C Ionian is the quality whitelist
-- (7 types) on each of the 5 non-scale pitch classes, spelled the way the
-- parallel Aeolian spells them (Eb/Ab/Bb) or with the flat fallback (Db/Gb),
-- each tagged with its harmonic device
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count FROM fn_mode_key_color_chord_set('Ionian', 'C');
    ASSERT v_count = 35, format('expected 35 C Ionian color chords, got %s', v_count);

    ASSERT NOT EXISTS (
        SELECT 1 FROM fn_mode_key_color_chord_set('Ionian', 'C')
        WHERE root_note IN (1, 3, 5, 6, 8, 10, 12)),
        'a color chord sits on a scale root';

    -- device spot checks: bVI and bVII are modal interchange, Db7 is the
    -- tritone sub of G7, Gb7 is the dominant of B, Dbm fits no device
    ASSERT (SELECT device FROM fn_mode_key_color_chord_set('Ionian', 'C')
            WHERE chord_name = 'Ab') = 'borrowed', 'Ab should be borrowed';
    ASSERT (SELECT device FROM fn_mode_key_color_chord_set('Ionian', 'C')
            WHERE chord_name = 'Bb') = 'borrowed', 'Bb should be borrowed';
    ASSERT (SELECT device FROM fn_mode_key_color_chord_set('Ionian', 'C')
            WHERE chord_name = 'Db7') = 'tritone_sub', 'Db7 should be a tritone sub';
    ASSERT (SELECT device FROM fn_mode_key_color_chord_set('Ionian', 'C')
            WHERE chord_name = 'Gb7') = 'secondary_dominant',
        'Gb7 should be a secondary dominant';
    ASSERT (SELECT device FROM fn_mode_key_color_chord_set('Ionian', 'C')
            WHERE chord_name = 'Dbm') = 'chromatic', 'Dbm should be chromatic';

    -- only plain major/minor triads can receive a chromatic-mediant move
    ASSERT NOT EXISTS (
        SELECT 1 FROM fn_mode_key_color_chord_set('Ionian', 'C')
        WHERE mediant_quality AND chord_name NOT IN ('Db','Dbm','Eb','Ebm','Gb','Gbm','Ab','Abm','Bb','Bbm')),
        'mediant_quality marks a non-triad';
    RAISE NOTICE 'ok: color chord set';
END $$;

-- color weight: the search reaches borrowed roots, and the winning
-- progression carries at least one (the color pull), with reported costs
-- still the true voice-leading motion (checked by the helper)
DO $$
BEGIN
    PERFORM _test_progression('color weight 2', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_color => 2);
    ASSERT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE cv.note NOT IN (1, 3, 5, 6, 8, 10, 12)),
        'color weight 2: no borrowed-root chord in the result';
    RAISE NOTICE 'ok: borrowed root lands';
END $$;

-- device whitelist: with only mediant moves allowed, every borrowed-root
-- chord is a plain maj/min triad -- never a secondary dominant or any other
-- dom7 color
DO $$
BEGIN
    PERFORM _test_progression('color devices mediant', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_color => 2, p_devices => ARRAY['mediant']);
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE cv.note NOT IN (1, 3, 5, 6, 8, 10, 12)
          AND cv.chord_type NOT IN ('', 'm')),
        'devices [mediant]: a non-triad borrowed-root chord appeared';
    RAISE NOTICE 'ok: device whitelist holds';
END $$;

-- with borrowed roots the distinct-root ceiling lifts past the 7 scale
-- degrees; the widened graph must still answer fast
DO $$
DECLARE
    v_started timestamptz := clock_timestamp();
    v_elapsed_ms numeric;
BEGIN
    PERFORM _test_progression('color length 9', 9, NULL, 'Ionian', 'C', 'Cmaj7', 9,
                              p_color => 2);
    v_elapsed_ms := extract(epoch FROM clock_timestamp() - v_started) * 1000;
    ASSERT v_elapsed_ms < 4000,
        format('color length 9: took %s ms, expected under 4000', round(v_elapsed_ms));

    -- a 9-chord progression needs at least two borrowed roots
    ASSERT (SELECT count(*) FROM _test_result r
            JOIN chord_view cv ON cv.chord_name = r.chord
            WHERE cv.note NOT IN (1, 3, 5, 6, 8, 10, 12)) >= 2,
        'color length 9: fewer than two borrowed roots';
    RAISE NOTICE 'ok: color lifts the length ceiling within budget';
END $$;

-- endings: hard cadence constraints on the last step or two, checked by root
-- scale degree (C Ionian pitch classes: C=1, F=6, G=8, A=10). The join to the
-- scale chord set doubles as a check that every picked chord stays diatonic.
CREATE OR REPLACE FUNCTION _test_ending_roots(p_ending text, p_len integer)
RETURNS integer[] LANGUAGE sql AS $$
    SELECT array_agg(c.root_note ORDER BY p.step)
    FROM fn_smooth_progression('Ionian', 'C', 'Cmaj7', p_len, p_ending => p_ending) p
    JOIN fn_mode_key_chord_set('Ionian', 'C') c ON c.chord_name = p.chord;
$$;

DO $$
DECLARE
    v_roots integer[];
BEGIN
    -- authentic: degree 5 then the tonic -- the final step may revisit the
    -- tonic root the start chord used, which free steps never do
    v_roots := _test_ending_roots('authentic', 4);
    ASSERT cardinality(v_roots) = 4, 'authentic: expected 4 rows';
    ASSERT v_roots[3] = 8 AND v_roots[4] = 1,
        format('authentic: expected roots ..8,1, got %s', v_roots);
    -- and the penultimate chord carries a major third (B), not a minor (Bb)
    ASSERT EXISTS (
        SELECT 1
        FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_ending => 'authentic') p
        JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord
        WHERE p.step = 3 AND 12 = ANY (c.chord_notes)
                         AND NOT (11 = ANY (c.chord_notes))),
        'authentic: penultimate chord is not major/dominant';

    v_roots := _test_ending_roots('plagal', 5);
    ASSERT v_roots[4] = 6 AND v_roots[5] = 1,
        format('plagal: expected roots ..6,1, got %s', v_roots);

    v_roots := _test_ending_roots('deceptive', 4);
    ASSERT v_roots[3] = 8 AND v_roots[4] = 10,
        format('deceptive: expected roots ..8,10, got %s', v_roots);

    -- half: ends on degree 5, and the cadence's degree is reserved for it --
    -- no earlier free chord camps on that root
    v_roots := _test_ending_roots('half', 4);
    ASSERT v_roots[4] = 8, format('half: expected final root 8, got %s', v_roots);
    ASSERT (SELECT count(*) FROM unnest(v_roots) r WHERE r = 8) = 1,
        format('half: a mid-path chord sits on the cadence degree: %s', v_roots);

    -- open: anything but the tonic degree
    v_roots := _test_ending_roots('open', 4);
    ASSERT v_roots[4] <> 1, format('open: final root is the tonic: %s', v_roots);
    RAISE NOTICE 'ok: endings land';
END $$;

-- a pin on the final step beats the ending; the unpinned penultimate step
-- still honours the cadence
DO $$
DECLARE
    v_penult text;
BEGIN
    DROP TABLE IF EXISTS _test_result;
    CREATE TEMP TABLE _test_result AS
        SELECT * FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            p_pinned_chords => ARRAY['Dm7'], p_pinned_positions => ARRAY[4],
            p_ending => 'authentic');
    ASSERT (SELECT count(*) FROM _test_result) = 4, 'pin vs ending: expected 4 rows';
    ASSERT (SELECT chord FROM _test_result WHERE step = 4) = 'Dm7',
        'pin vs ending: the pin should win the final step';
    SELECT chord INTO v_penult FROM _test_result WHERE step = 3;
    ASSERT EXISTS (SELECT 1 FROM fn_mode_key_chord_set('Ionian','C') c
                   WHERE c.chord_name = v_penult AND c.root_note = 8),
        format('pin vs ending: penultimate %s is not on degree 5', v_penult);
    RAISE NOTICE 'ok: pin beats ending';
END $$;

-- ending edge cases: an unknown name is dropped, not fatal; a cadence naming
-- a degree the scale lacks (a pentatonic has no degree 6) returns nothing
DO $$
BEGIN
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            p_ending => 'zzz')) = 4,
        'unknown ending should be dropped and the call still succeed';
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Major Pentatonic','C','C',4,
            p_ending => 'deceptive')) = 0,
        'deceptive in a pentatonic should return nothing';
    RAISE NOTICE 'ok: ending edge cases';
END $$;

-- loop weight: the winning progression wraps back to the start chord more
-- smoothly than the plain winner, and reported costs stay the true motion
DO $$
DECLARE
    v_start    integer[];
    v_wrap_off integer;
    v_wrap_on  integer;
BEGIN
    SELECT chord_notes INTO v_start
    FROM fn_mode_key_chord_set('Ionian','C') WHERE chord_name = 'Cmaj7';

    SELECT fn_voice_leading_distance(c.chord_notes, v_start) INTO v_wrap_off
    FROM fn_smooth_progression('Ionian','C','Cmaj7',4) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord
    WHERE p.step = 4;

    SELECT fn_voice_leading_distance(c.chord_notes, v_start) INTO v_wrap_on
    FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_loop_weight => 3) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord
    WHERE p.step = 4;

    ASSERT v_wrap_on <= v_wrap_off AND v_wrap_on <= 2,
        format('loop weight: wrap distance %s (loop on) vs %s (loop off)',
               v_wrap_on, v_wrap_off);
    ASSERT (SELECT sum(vl_from_prev) = max(total_cost)
            FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_loop_weight => 3)),
        'loop weight: reported costs must still be the true motion';
    RAISE NOTICE 'ok: loop weight tightens the wrap-around';
END $$;

-- loop + half ending: the loop-with-lift -- still ends on degree 5
DO $$
DECLARE
    v_final integer;
BEGIN
    SELECT c.root_note INTO v_final
    FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
             p_ending => 'half', p_loop_weight => 2) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord
    WHERE p.step = 4;
    ASSERT v_final = 8, format('half + loop: expected final root 8, got %s', v_final);
    RAISE NOTICE 'ok: loop composes with the half ending';
END $$;

DROP FUNCTION _test_ending_roots(text, integer);

-- avoid notes: a hard filter on free chords; the start chord is exempt even
-- when it contains an avoided note
DO $$
BEGIN
    PERFORM _test_progression('avoid the leading tone', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_avoid => ARRAY['B']);
    ASSERT NOT EXISTS (
        SELECT 1 FROM _test_result r
        JOIN chord_view cv ON cv.chord_name = r.chord
        WHERE r.step > 1 AND 12 = ANY (cv.chord_note_array)),
        'avoid B: a free chord after step 1 contains B';
    -- the start chord itself may carry the avoided note -- it is taken as given
    PERFORM _test_progression('avoid note vs start chord', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_avoid => ARRAY['B']);
    ASSERT (SELECT chord FROM _test_result WHERE step = 1) = 'Cmaj7',
        'avoid B: the start chord (which contains B) should still be honored';
    RAISE NOTICE 'ok: avoid notes stay out of free chords';
END $$;

-- avoid notes vs pins: a pin may still carry the avoided note -- the caller
-- asked for it, same exemption as the start chord
DO $$
BEGIN
    PERFORM _test_progression('avoid note vs pin', 4, NULL, 'Ionian', 'C', 'Cmaj7', 4,
                              p_pin_chords => ARRAY['Bm7b5'], p_pin_pos => ARRAY[3],
                              p_avoid => ARRAY['B']);
    ASSERT (SELECT chord FROM _test_result WHERE step = 3) = 'Bm7b5',
        'avoid B vs pin: the pin should win even though it contains B';
    RAISE NOTICE 'ok: a pin is exempt from avoid notes';
END $$;

-- motion profiles: each rewards a different interval family in the picked
-- progression, distinctly from the functional default
DO $$
DECLARE
    v_roots integer[];
BEGIN
    -- mediant: with root weight on, root motion chains by thirds (interval
    -- 3, 4, 8, or 9 semitones between consecutive roots)
    SELECT array_agg(c.root_note ORDER BY p.step) INTO v_roots
    FROM fn_smooth_progression('Ionian','C','C',4, p_root_weight => 3,
                                p_motion_profile => 'mediant') p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord;
    ASSERT NOT EXISTS (
        SELECT 1 FROM generate_series(1, 3) i
        WHERE (v_roots[i+1] - v_roots[i] + 12) % 12 NOT IN (3, 4, 8, 9)),
        format('mediant profile: expected an all-thirds root chain, got %s', v_roots);

    -- stepwise: root motion moves by a semitone or whole step throughout
    SELECT array_agg(c.root_note ORDER BY p.step) INTO v_roots
    FROM fn_smooth_progression('Ionian','C','C',4, p_root_weight => 3,
                                p_motion_profile => 'stepwise') p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord;
    ASSERT NOT EXISTS (
        SELECT 1 FROM generate_series(1, 3) i
        WHERE (v_roots[i+1] - v_roots[i] + 12) % 12 NOT IN (1, 2, 10, 11)),
        format('stepwise profile: expected small root steps throughout, got %s', v_roots);

    -- an unknown profile name behaves like the (unset) functional default
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            p_motion_profile => 'zzz')) = 4,
        'unknown motion profile should be dropped and the call still succeed';
    RAISE NOTICE 'ok: motion profiles steer root motion';
END $$;

-- revisit weight: the fresh-root rule relaxes into a priced preference, so
-- roots may return after an intervening chord and lengths past the 7 scale
-- degrees resolve without color. Adjacent chords still never share a root.
DO $$
DECLARE
    v_roots integer[];
BEGIN
    -- 8 in-scale steps are impossible under the hard rule (asserted in the
    -- edge cases below); with revisit weight they resolve
    SELECT array_agg(c.root_note ORDER BY p.step) INTO v_roots
    FROM fn_smooth_progression('Ionian','C','Cmaj7',8, p_revisit_weight => 2) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord;
    ASSERT cardinality(v_roots) = 8,
        format('revisit length 8: expected 8 rows, got %s', cardinality(v_roots));
    ASSERT (SELECT count(DISTINCT r) FROM unnest(v_roots) r) < 8,
        'revisit length 8: eight rows require a repeated root';
    ASSERT NOT EXISTS (
        SELECT 1 FROM generate_series(1, 7) i WHERE v_roots[i] = v_roots[i+1]),
        format('revisit length 8: adjacent chords share a root: %s', v_roots);

    -- reported costs stay the true motion, as with every knob
    ASSERT (SELECT sum(vl_from_prev) = max(total_cost)
            FROM fn_smooth_progression('Ionian','C','Cmaj7',8, p_revisit_weight => 2)),
        'revisit: reported costs must still be the true motion';

    -- at short lengths the penalty keeps fresh roots preferred: the winner
    -- matches the plain call's cost and repeats nothing
    SELECT array_agg(c.root_note ORDER BY p.step) INTO v_roots
    FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_revisit_weight => 2) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord;
    ASSERT (SELECT count(DISTINCT r) FROM unnest(v_roots) r) = 4,
        format('revisit length 4: fresh roots should still win, got %s', v_roots);
    ASSERT (SELECT max(total_cost)
            FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_revisit_weight => 2)) = 4,
        'revisit length 4: the winner should match the plain cost-4 result';
    RAISE NOTICE 'ok: revisit weight opens priced returns';
END $$;

-- revisit weight composes: pinned degrees stay reserved (only the pin's own
-- step sits on its root), and a cadence still binds the last steps
DO $$
DECLARE
    v_g_steps integer;
    v_roots   integer[];
BEGIN
    SELECT count(*) INTO v_g_steps
    FROM fn_smooth_progression('Ionian','C','Cmaj7',6,
             p_pinned_chords => ARRAY['G7'], p_pinned_positions => ARRAY[3],
             p_revisit_weight => 3) p
    JOIN chord_view cv ON cv.chord_name = p.chord
    WHERE cv.note = 8;
    ASSERT v_g_steps = 1,
        format('revisit vs pin: %s chords sit on the pinned root', v_g_steps);

    SELECT array_agg(c.root_note ORDER BY p.step) INTO v_roots
    FROM fn_smooth_progression('Ionian','C','Cmaj7',8,
             p_ending => 'authentic', p_revisit_weight => 2) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord;
    ASSERT cardinality(v_roots) = 8, 'revisit + authentic: expected 8 rows';
    ASSERT v_roots[7] = 8 AND v_roots[8] = 1,
        format('revisit + authentic: expected roots ..8,1, got %s', v_roots);
    RAISE NOTICE 'ok: revisit composes with pins and endings';
END $$;

-- brightness: steers the picked chords toward the requested circle-of-fifths
-- pole; reported costs stay the true voice-leading motion
DO $$
DECLARE
    v_bright_avg numeric;
    v_dark_avg   numeric;
BEGIN
    SELECT avg(fn_chord_brightness(c.chord_notes, 1)) INTO v_bright_avg
    FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_brightness => 1) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord
    WHERE p.step > 1;

    SELECT avg(fn_chord_brightness(c.chord_notes, 1)) INTO v_dark_avg
    FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_brightness => -1) p
    JOIN fn_mode_key_chord_set('Ionian','C') c ON c.chord_name = p.chord
    WHERE p.step > 1;

    ASSERT v_bright_avg > v_dark_avg,
        format('brightness: bright-target avg %s not greater than dark-target avg %s',
               v_bright_avg, v_dark_avg);

    ASSERT (SELECT sum(vl_from_prev) = max(total_cost)
            FROM fn_smooth_progression('Ionian','C','Cmaj7',4, p_brightness => 1)),
        'brightness: reported costs must still be the true motion';
    RAISE NOTICE 'ok: brightness steers toward the requested pole';
END $$;

-- edge cases
DO $$
BEGIN
    -- length 1 is just the start chord at cost 0
    PERFORM _test_progression('length 1', 1, 0, 'Ionian', 'C', 'Cmaj7', 1);

    -- a mode has 7 degrees, so 8 distinct roots are impossible
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',8)) = 0,
        'length 8 should return nothing';

    -- unknown start chord returns nothing
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Zzz9',4)) = 0,
        'unknown start chord should return nothing';

    -- more pins than open steps returns nothing
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',2,0,'{}',0,0,
            ARRAY['Am7','G7','Dm7'], ARRAY[NULL,NULL,NULL]::integer[])) = 0,
        'over-pinned call should return nothing';

    -- a pin that is not a known chord is dropped, not fatal
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,0,'{}',0,0,
            ARRAY['Qqq13'], ARRAY[3])) = 4,
        'unknown pin should be dropped and the call still succeed';

    -- an unknown required note is dropped, not fatal; same for a requirement
    -- on step 1, which always belongs to the start chord
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,0,'{}',0,0,
            '{}','{}',0, ARRAY['Zzz','Eb'], ARRAY[3,1])) = 4,
        'unknown or step-1 required notes should be dropped and the call still succeed';

    -- randomness changes the pick, never the reported costs
    ASSERT (SELECT sum(vl_from_prev) = max(total_cost)
            FROM fn_smooth_progression('Ionian','C','Cmaj7',4,1.0)),
        'with randomness, reported costs must still be the true motion';

    -- an unknown device tag is dropped (leaving all devices allowed), not fatal
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,0,'{}',0,0,
            '{}','{}',0,'{}','{}',1, 2, ARRAY['zzz'])) = 4,
        'unknown device tag should be dropped and the call still succeed';

    -- an unknown avoid-note name is dropped, not fatal
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            p_avoid_notes => ARRAY['Zzz'])) = 4,
        'unknown avoid note should be dropped and the call still succeed';

    -- an unknown bass note name is dropped, not fatal; same for a bass at
    -- step 1, which always belongs to the start chord
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            p_bass_notes => ARRAY['Zzz','E'], p_bass_positions => ARRAY[3,1])) = 4,
        'unknown or step-1 bass notes should be dropped and the call still succeed';

    -- avoiding every scale note but the start chord's own empties the beam
    -- and returns nothing, like any other over-constrained call
    ASSERT (SELECT count(*) FROM fn_smooth_progression('Ionian','C','Cmaj7',4,
            p_avoid_notes => ARRAY['D','E','F','G','A','B'])) = 0,
        'avoiding nearly every scale note should leave no legal free chord';
    RAISE NOTICE 'ok: edge cases';
END $$;

DROP FUNCTION _test_progression(text, integer, integer, text, text, text, integer,
                                numeric, numeric, text[], text[], integer[], integer,
                                text[], integer[], numeric, text[],
                                text, numeric, numeric, text[], text,
                                text[], integer[], integer);

\echo 'all voice-leading tests passed'
