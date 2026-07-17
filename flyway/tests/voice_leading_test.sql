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

    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[5,8,12]) = 1, 'C to Em';
    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[10,1,5]) = 2, 'C to Am';
    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[9,1,4])  = 2, 'C to Ab';
    ASSERT fn_voice_leading_distance(ARRAY[6,10,1], ARRAY[8,12,3]) = 5, 'F to G';
    ASSERT fn_voice_leading_distance(ARRAY[1,5,8],  ARRAY[1,5,8])  = 0, 'same set is zero';
    RAISE NOTICE 'ok: distance functions';
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
    p_color numeric DEFAULT 0, p_devices text[] DEFAULT '{}'
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
            1, p_color, p_devices);

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
    ASSERT v_elapsed_ms < 2000,
        format('color length 9: took %s ms, expected under 2000', round(v_elapsed_ms));

    -- a 9-chord progression needs at least two borrowed roots
    ASSERT (SELECT count(*) FROM _test_result r
            JOIN chord_view cv ON cv.chord_name = r.chord
            WHERE cv.note NOT IN (1, 3, 5, 6, 8, 10, 12)) >= 2,
        'color length 9: fewer than two borrowed roots';
    RAISE NOTICE 'ok: color lifts the length ceiling within budget';
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
    RAISE NOTICE 'ok: edge cases';
END $$;

DROP FUNCTION _test_progression(text, integer, integer, text, text, text, integer,
                                numeric, numeric, text[], text[], integer[], integer,
                                text[], integer[], numeric, text[]);

\echo 'all voice-leading tests passed'
