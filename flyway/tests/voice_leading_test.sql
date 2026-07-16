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
    p_req_notes text[] DEFAULT '{}', p_req_pos integer[] DEFAULT '{}'
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
            p_pin_chords, p_pin_pos, p_max, p_req_notes, p_req_pos);

    SELECT count(*), sum(vl_from_prev), max(total_cost),
           count(DISTINCT chord)
    INTO v_rows, v_sum, v_total, v_names
    FROM _test_result;
    SELECT chord INTO v_first FROM _test_result WHERE step = 1;

    ASSERT v_rows = expect_len,
        format('%s: expected %s rows, got %s', label, expect_len, v_rows);
    ASSERT v_first = p_start,
        format('%s: expected to start on %s, got %s', label, p_start, v_first);
    ASSERT v_sum = v_total,
        format('%s: step costs sum to %s but total_cost says %s', label, v_sum, v_total);
    ASSERT v_total = expect_cost,
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
    RAISE NOTICE 'ok: edge cases';
END $$;

DROP FUNCTION _test_progression(text, integer, integer, text, text, text, integer,
                                numeric, numeric, text[], text[], integer[], integer,
                                text[], integer[]);

\echo 'all voice-leading tests passed'
