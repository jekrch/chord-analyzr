--
-- VOICE LEADING & HARMONIC PATHFINDING
--
-- Builds a weighted graph out of the chord/scale model -- chords are nodes,
-- the semitone motion between two chords is the edge weight -- and searches it
-- for smooth chord progressions.
--
-- Regression tests (run them before and after changing this file):
--   flyway/tests/voice_leading_test.sql
--
-- Runs after R__views.sql (repeatable migrations run in name order), so
-- chord_view and mode_notes_mv already exist.


-- Semitones between two pitch classes, the short way around the circle.
-- Pitch classes are 1..12 (C=1 .. B=12), matching note.note.
-- Examples: C(1) to B(12) = 1; C(1) to F#(7) = 6, the maximum.
CREATE OR REPLACE FUNCTION fn_pitch_class_distance(a integer, b integer)
RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT LEAST(d, 12 - d) FROM (SELECT abs(a - b) % 12 AS d) t;
$$;


-- How purposeful a root move sounds, as a penalty: 0 is the strongest move,
-- 4 the weakest. Smooth voice leading alone tends to wander aimlessly;
-- blending this into the search score favors progressions that sound
-- intentional. Keyed on the ascending semitone interval between the roots.
CREATE OR REPLACE FUNCTION fn_root_motion_penalty(from_root integer, to_root integer)
RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT CASE (to_root - from_root + 12) % 12
        WHEN 5  THEN 0      -- down a fifth: ii-V-I, the backbone
        WHEN 2  THEN 1      -- up a whole step: IV-V and friends
        WHEN 8  THEN 1      -- down a major third
        WHEN 9  THEN 1      -- down a minor third
        WHEN 1  THEN 2      -- the remaining small steps: plausible, weaker
        WHEN 3  THEN 2
        WHEN 10 THEN 2
        WHEN 11 THEN 2
        WHEN 4  THEN 3      -- up a major third: weak
        WHEN 7  THEN 3      -- up a fifth: retrogression
        WHEN 6  THEN 3      -- tritone
        ELSE 4              -- same root (blocked anyway by the distinct-root rule)
    END;
$$;


-- Total semitone motion to turn one chord into the other. For each note in
-- either chord, find the nearest note in the other chord; sum those moves per
-- side and take the larger sum. Shared notes cost 0, so the metric rewards
-- common tones and small steps. Octave-agnostic, and the chords may differ in
-- size. Returns 0 only when both chords contain exactly the same notes.
-- Known values (asserted in the tests): C->Em = 1, C->Am = 2, F->G = 5.
CREATE OR REPLACE FUNCTION fn_voice_leading_distance(chord_a integer[], chord_b integer[])
RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT GREATEST(
        (SELECT COALESCE(SUM(nearest), 0)
         FROM (SELECT MIN(fn_pitch_class_distance(x, y)) AS nearest
               FROM unnest(chord_a) AS x CROSS JOIN unnest(chord_b) AS y
               GROUP BY x) side_a),
        (SELECT COALESCE(SUM(nearest), 0)
         FROM (SELECT MIN(fn_pitch_class_distance(x, y)) AS nearest
               FROM unnest(chord_a) AS x CROSS JOIN unnest(chord_b) AS y
               GROUP BY y) side_b)
    );
$$;


-- Every chord that fits a mode+key: the root is a scale note, spelled the way
-- this scale spells it, and every chord note is in the scale. chord_view
-- lists each chord under every enharmonic spelling of its root (G6, Abb6,
-- F##6, ...); the spelling join keeps just the one that matches the scale,
-- which cuts ~300 candidates down to ~100 real chords per mode+key.
--
-- p_extra_notes (pitch classes) widens the set: chord notes may also come
-- from that list, for borrowed/outside color. Roots must still be scale
-- notes. uses_extra_note marks chords that actually use one.
--
-- If you change this function's output columns, drop the two views below
-- first -- they are defined on top of it.
CREATE OR REPLACE FUNCTION fn_mode_key_chord_set(
    p_mode text, p_key text, p_extra_notes integer[] DEFAULT '{}')
RETURNS TABLE(chord_name text, root_note integer, chord_notes integer[], uses_extra_note boolean)
LANGUAGE sql STABLE
AS $$
    SELECT cv.chord_name,
           cv.note             AS root_note,
           cv.chord_note_array AS chord_notes,
           EXISTS (SELECT 1 FROM unnest(cv.chord_note_array) cn
                   WHERE cn = ANY (p_extra_notes)) AS uses_extra_note
    FROM mode_notes_mv mn
    JOIN chord_view cv
        ON cv.note = ANY (mn.mode_notes)             -- root is a scale note
    JOIN mode_scale_note_letter_mv spelling          -- spelled as the scale spells it
        ON  spelling.mode_id   = mn.mode_id
        AND spelling.key_name  = mn.key_name
        AND spelling.note      = cv.note
        AND spelling.note_name = cv.note_name
    WHERE mn.mode = p_mode AND mn.key_name = p_key
      AND NOT EXISTS (                               -- every chord note in scale or extras
          SELECT 1 FROM unnest(cv.chord_note_array) cn
          WHERE cn <> ALL (mn.mode_notes)
            AND cn <> ALL (p_extra_notes)
      );
$$;


-- The chords of every mode+key, for exploration and demos. (The API calls
-- fn_smooth_progression, which builds its own graph from the function above.)
CREATE OR REPLACE VIEW mode_key_chord_view AS
SELECT mn.mode_id, mn.mode, mn.key_name, c.chord_name, c.root_note, c.chord_notes
FROM mode_notes_mv mn
CROSS JOIN LATERAL fn_mode_key_chord_set(mn.mode, mn.key_name) c;


-- Voice-leading distance between every pair of chords in a mode+key.
-- Distance 0 means the same notes under a different name (C6 / Am7) -- a
-- renaming, not a move -- so those pairs are left out. A plain view: it is
-- only ever queried for one mode+key, whose ~100 chords pair up on demand;
-- computing all keys at once is never needed.
CREATE OR REPLACE VIEW mode_key_chord_edge_view AS
SELECT e.*
FROM (
    SELECT mn.mode_id, mn.mode, mn.key_name,
           a.chord_name  AS from_chord,
           a.chord_notes AS from_notes,
           b.chord_name  AS to_chord,
           b.chord_notes AS to_notes,
           fn_voice_leading_distance(a.chord_notes, b.chord_notes) AS vl_distance
    FROM mode_notes_mv mn
    CROSS JOIN LATERAL fn_mode_key_chord_set(mn.mode, mn.key_name) a
    CROSS JOIN LATERAL fn_mode_key_chord_set(mn.mode, mn.key_name) b
    WHERE a.chord_name <> b.chord_name
) e
WHERE e.vl_distance > 0;


-- fn_chord_path (cheapest path between two chords) was removed: on this graph
-- the cheapest unconstrained path is nearly always the direct edge, so the
-- function just returned its own inputs. Details in the design doc.
DROP FUNCTION IF EXISTS fn_chord_path(text, text, text, text, integer);


-- The smoothest progression of exactly p_length chords in a mode+key,
-- starting on p_start_chord: least total voice-leading motion, one chord per
-- scale degree. Requiring a fresh root at each step is what makes the result
-- a progression -- without it the cheapest path just wiggles between voicings
-- of one chord (Cmaj7 -> C -> Csus4). A mode has 7 degrees, so p_length > 7
-- returns nothing.
--
-- Finding the exact best fixed-length path is combinatorial, so this is a
-- beam search: extend every kept path by one chord, score the results, keep
-- the best c_beam_width, repeat. The beam is wide next to the ~100-chord
-- graph, so results are optimal or near-optimal at the lengths we use.
--
-- Optional knobs, all off by default (details and examples in the design doc):
--
--   p_randomness   0..1. Adds jitter to the scoring so runs vary. Reported
--                  costs are always the true voice-leading motion.
--   p_extra_notes  note names ('F#', 'Bb', ...) that chords may borrow from
--                  outside the scale. At least one borrowing chord appears in
--                  the result if any survived the search. Unknown names are
--                  ignored.
--   p_root_weight  > 0 favors strong root motion (down a fifth above all) at
--                  some cost in smoothness. Try 1-3.
--   p_slash_weight > 0 allows slash-chord voicings (Cmaj7/E, ...) and favors
--                  paths with a smoother bass line. Try 1-3.
--   p_pinned_chords / p_pinned_positions
--                  chords that must appear, as parallel arrays: position i
--                  fixes chord i at that step (1-based; step 1 belongs to the
--                  start chord). A NULL or out-of-range position means "place
--                  it wherever it costs least". Pins may revisit a scale
--                  degree; the chords the search picks stay off the pins'
--                  degrees. Unknown pin names are dropped. Pinning more
--                  chords than there are open steps returns nothing.
--   p_max_notes    > 0 loosely caps chord size: each note past the cap adds
--                  a scoring penalty rather than excluding the chord, so
--                  bigger chords still appear when nothing leaner comes
--                  close. p_randomness doubles as the cap's escape hatch:
--                  it is each oversized candidate's chance to skip the
--                  penalty and compete on smoothness alone. The start chord
--                  and pins are never capped.
--   p_required_notes / p_required_positions
--                  notes that must sound at given steps, as parallel arrays:
--                  position i (2..p_length, 1-based) means the chord at that
--                  step has to contain note i ('Bb', 'F#', ...). Made for
--                  reharmonizing under a melody: require each melody note at
--                  its step. Several entries may name one step; the chord
--                  must contain them all. A required note outside the scale
--                  is honored -- chords may borrow it, but only at the steps
--                  that require it. A requirement at step 1 or on a pinned
--                  step is dropped (those chords are the caller's own), as
--                  is an unknown note name.
--
-- The start chord and the pins are taken as given even when they use notes
-- from outside the mode (secondary dominants, borrowed chords, ...). Only the
-- chords the search fills in are held to the scale, plus p_extra_notes.

-- The signature has grown over time. Drop every old overload, whatever its
-- shape, so shorter calls resolve to this definition through its defaults.
DO $$
DECLARE
    v_old regprocedure;
BEGIN
    FOR v_old IN SELECT oid::regprocedure FROM pg_proc
                 WHERE proname = 'fn_smooth_progression'
    LOOP
        EXECUTE format('DROP FUNCTION %s', v_old);
    END LOOP;
END $$;

CREATE FUNCTION fn_smooth_progression(
    p_mode         text,
    p_key          text,
    p_start_chord  text,
    p_length       integer,
    p_randomness   numeric DEFAULT 0,
    p_extra_notes  text[]  DEFAULT '{}',
    p_root_weight  numeric DEFAULT 0,
    p_slash_weight numeric DEFAULT 0,
    p_pinned_chords    text[]    DEFAULT '{}',
    p_pinned_positions integer[] DEFAULT '{}',
    p_max_notes        integer   DEFAULT 0,
    p_required_notes     text[]    DEFAULT '{}',
    p_required_positions integer[] DEFAULT '{}'
)
RETURNS TABLE(step integer, chord text, vl_from_prev integer, total_cost integer)
LANGUAGE plpgsql VOLATILE
AS $$
DECLARE
    -- Each candidate path gets a score; lower is better. The score is
    --     cost                                        true voice-leading motion
    --   + jitter                                      randomness, if requested
    --   - extra_note_count * c_extra_note_bonus       pulls borrowed color into the beam
    --   + unplaced pins * c_unplaced_pin_penalty      pulls pins in early
    --   + oversize * c_oversize_note_penalty          notes past p_max_notes,
    --                                                 minus randomness waivers
    --   + root_penalty * p_root_weight                favors strong root motion
    --   + bass_motion * p_slash_weight                favors a smooth bass line
    -- Only the winner changes with the score; reported costs never do.
    c_beam_width           CONSTANT integer := 500;
    c_max_jitter_per_step  CONSTANT numeric := 6;    -- at p_randomness = 1
    c_extra_note_bonus     CONSTANT numeric := 6;
    c_unplaced_pin_penalty CONSTANT numeric := 6;
    c_oversize_note_penalty CONSTANT numeric := 6;   -- per unwaived note past the cap

    v_step                integer;
    v_extra_pitch_classes integer[];    -- p_extra_notes resolved via the note table
    v_required_pitch_classes integer[]; -- every required pitch class, any step
    v_scale_pool          integer[];    -- scale notes + extras: what a free chord may use
    v_step_required       integer[];    -- pitch classes required at the current step
    v_step_pool           integer[];    -- v_scale_pool + this step's required notes
    v_pin                 text;
    v_pin_position        integer;
    v_pinned_at_step      text[];       -- pinned chord per step; NULL = search chooses
    v_floating_pins       text[];       -- pins with no fixed step
    v_requested_chords    text[];       -- start chord + pins, added to the graph as-is
    v_reserved_roots      integer[];    -- the pins' scale degrees
    v_open_steps_left     integer;
    v_best_path           text[];
    v_best_step_costs     integer[];
    v_best_cost           integer;
BEGIN
    -- resolve the extra note names to pitch classes; any spelling of a pitch
    -- works, unknown names drop out
    SELECT COALESCE(array_agg(DISTINCT n.note), '{}')
    INTO v_extra_pitch_classes
    FROM unnest(p_extra_notes) AS extra_name
    JOIN note n ON n.name = btrim(extra_name);

    -- sort the pins into fixed-step ones and floating ones. A position counts
    -- when it names a step in 2..p_length that isn't already taken (step 1
    -- belongs to the start chord); otherwise the pin floats. Duplicate
    -- floating pins collapse into one.
    v_pinned_at_step := array_fill(NULL::text, ARRAY[GREATEST(p_length, 1)]);
    v_floating_pins  := '{}';
    FOR i IN 1 .. COALESCE(cardinality(p_pinned_chords), 0) LOOP
        v_pin := btrim(p_pinned_chords[i]);
        CONTINUE WHEN v_pin IS NULL OR v_pin = '';
        v_pin_position := p_pinned_positions[i];
        IF v_pin_position BETWEEN 2 AND p_length
           AND v_pinned_at_step[v_pin_position] IS NULL THEN
            v_pinned_at_step[v_pin_position] := v_pin;
        ELSIF NOT (v_pin = ANY (v_floating_pins)) THEN
            v_floating_pins := v_floating_pins || v_pin;
        END IF;
    END LOOP;

    -- required notes, resolved to pitch classes per step. Step 1 belongs to
    -- the start chord, so only positions 2..p_length count; the rest drop,
    -- as do unknown note names.
    DROP TABLE IF EXISTS _vl_required;
    CREATE TEMP TABLE _vl_required ON COMMIT DROP AS
        SELECT DISTINCT req.at_step, n.note AS pitch_class
        FROM unnest(p_required_notes, p_required_positions) AS req(note_name, at_step)
        JOIN note n ON n.name = btrim(req.note_name)
        WHERE req.at_step BETWEEN 2 AND p_length;

    SELECT COALESCE(array_agg(DISTINCT r.pitch_class), '{}')
    INTO v_required_pitch_classes
    FROM _vl_required r;

    -- build this mode+key's graph in temp tables. Reading
    -- mode_key_chord_edge_view here instead would recompute the chord set once
    -- per chord pair, because the mode/key filter can't reach both sides of
    -- its self-join; built here it's ~100 chords once, then ~10k pairs.
    -- Required notes widen the set like extras do, so chords that carry them
    -- exist in the graph -- but only true extras count as "extra" for the
    -- scoring, and the beam filter below confines required-note borrowers to
    -- the steps that require them.
    DROP TABLE IF EXISTS _vl_chords;
    CREATE TEMP TABLE _vl_chords ON COMMIT DROP AS
        SELECT c.chord_name, c.root_note, c.chord_notes,
               EXISTS (SELECT 1 FROM unnest(c.chord_notes) cn
                       WHERE cn = ANY (v_extra_pitch_classes)) AS uses_extra_note
        FROM fn_mode_key_chord_set(p_mode, p_key,
                 v_extra_pitch_classes || v_required_pitch_classes) c;

    -- what a freely chosen chord may be built from: scale notes plus extras.
    -- Chords borrowing a required note fall outside this pool, which is what
    -- keeps them out of the steps that didn't ask for them.
    SELECT mn.mode_notes || v_extra_pitch_classes INTO v_scale_pool
    FROM mode_notes_mv mn
    WHERE mn.mode = p_mode AND mn.key_name = p_key;

    -- the caller's own chords (start + pins) join the graph as-is, even when
    -- they use notes from outside the mode -- the caller asked for them.
    -- Everything else stays strictly in scale. Adding them before the edge
    -- build gives them edges like any other chord.
    v_requested_chords := array_remove(v_pinned_at_step, NULL)
                          || v_floating_pins || ARRAY[p_start_chord];
    INSERT INTO _vl_chords (chord_name, root_note, chord_notes, uses_extra_note)
    SELECT DISTINCT cv.chord_name, cv.note, cv.chord_note_array,
           EXISTS (SELECT 1 FROM unnest(cv.chord_note_array) cn
                   WHERE cn = ANY (v_extra_pitch_classes))
    FROM chord_view cv
    WHERE cv.chord_name = ANY (v_requested_chords)
      AND NOT EXISTS (SELECT 1 FROM _vl_chords c WHERE c.chord_name = cv.chord_name);

    -- a pin that names no known chord is dropped rather than making the whole
    -- search unsatisfiable. An unknown start chord still returns nothing.
    SELECT COALESCE(array_agg(pin), '{}') INTO v_floating_pins
    FROM unnest(v_floating_pins) AS pin
    WHERE EXISTS (SELECT 1 FROM _vl_chords c WHERE c.chord_name = pin);
    FOR i IN 2 .. GREATEST(p_length, 1) LOOP
        IF v_pinned_at_step[i] IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM _vl_chords c
                           WHERE c.chord_name = v_pinned_at_step[i]) THEN
            v_pinned_at_step[i] := NULL;
        END IF;
    END LOOP;

    -- a requirement on a pinned step gives way to the pin: both came from the
    -- caller, but the pin names the exact chord.
    DELETE FROM _vl_required WHERE v_pinned_at_step[at_step] IS NOT NULL;

    -- pins may revisit a scale degree, but their degrees are off-limits to
    -- the chords the search picks. Without this the search parks a near-copy
    -- of the pin on its root just before the pin lands (G6 -> pinned G7) --
    -- exactly the wiggle the distinct-root rule exists to prevent.
    SELECT COALESCE(array_agg(DISTINCT c.root_note), '{}') INTO v_reserved_roots
    FROM _vl_chords c
    WHERE c.chord_name = ANY (array_remove(v_pinned_at_step, NULL) || v_floating_pins);

    -- every pair of different chords with its distance, in both directions
    -- (the metric is symmetric, so each pair is computed once). Distance-0
    -- moves -- same notes under another name, C6 / Am7 -- are kept so that a
    -- pinned chord is reachable from anywhere, but a free step must move.
    -- Each chord also carries its note count past p_max_notes (oversize);
    -- the caller's own chords are never counted as oversized.
    DROP TABLE IF EXISTS _vl_moves;
    CREATE TEMP TABLE _vl_moves ON COMMIT DROP AS
        WITH sized AS (
            SELECT c.*,
                   CASE WHEN p_max_notes > 0
                             AND NOT (c.chord_name = ANY (v_requested_chords))
                        THEN GREATEST(cardinality(c.chord_notes) - p_max_notes, 0)
                        ELSE 0 END AS oversize
            FROM _vl_chords c
        ),
        pair AS (
            SELECT a.chord_name AS a_chord, a.root_note AS a_root,
                   a.chord_notes AS a_notes,
                   a.uses_extra_note AS a_extra, a.oversize AS a_over,
                   b.chord_name AS b_chord, b.root_note AS b_root,
                   b.chord_notes AS b_notes,
                   b.uses_extra_note AS b_extra, b.oversize AS b_over,
                   fn_voice_leading_distance(a.chord_notes, b.chord_notes) AS vl_distance
            FROM sized a
            JOIN sized b ON a.chord_name < b.chord_name
        )
        SELECT a_chord AS from_chord, a_root AS from_root,
               b_chord AS to_chord,   b_root AS to_root,   b_notes AS to_notes,
               b_extra AS to_uses_extra, b_over AS to_oversize, vl_distance
        FROM pair
        UNION ALL
        SELECT b_chord, b_root, a_chord, a_root, a_notes, a_extra, a_over, vl_distance
        FROM pair;
    CREATE INDEX ON _vl_moves (from_chord);

    -- how each chord may be voiced: root position always; with p_slash_weight
    -- on, also over any other chord tone that is a scale note (Cmaj7 ->
    -- Cmaj7/E, Cmaj7/G, ...). Moves stay keyed on the plain chord name -- a
    -- voicing changes which note is lowest, never the note set -- so voicings
    -- multiply the beam, not the O(n^2) distance pass. The spelling join
    -- names the bass the way the scale does and skips non-scale basses.
    DROP TABLE IF EXISTS _vl_voicings;
    CREATE TEMP TABLE _vl_voicings ON COMMIT DROP AS
        SELECT chord_name, root_note AS bass_note, chord_name AS voiced_name
        FROM _vl_chords
        UNION ALL
        SELECT c.chord_name, tone, c.chord_name || '/' || spelling.note_name
        FROM _vl_chords c
        CROSS JOIN LATERAL unnest(c.chord_notes) AS tone
        JOIN mode_notes_mv mn
            ON mn.mode = p_mode AND mn.key_name = p_key
        JOIN mode_scale_note_letter_mv spelling
            ON  spelling.mode_id  = mn.mode_id
            AND spelling.key_name = mn.key_name
            AND spelling.note     = tone
        WHERE p_slash_weight > 0 AND tone <> c.root_note;
    CREATE INDEX ON _vl_voicings (chord_name);

    -- the beam: one row per partial progression kept so far
    DROP TABLE IF EXISTS _vl_paths;
    CREATE TEMP TABLE _vl_paths (
        last_chord       text,       -- plain chord name; join key for moves
        cost             integer,    -- total voice-leading motion so far
        jitter           numeric,    -- accumulated randomness (0 unless requested)
        extra_note_count integer,    -- chords so far that borrow an extra note
        oversize         integer,    -- unwaived notes past p_max_notes so far
        root_penalty     integer,    -- summed root-motion penalty
        bass             integer,    -- current bass pitch class
        bass_motion      integer,    -- summed semitone motion of the bass line
        path             text[],     -- voiced chord names, in order
        step_costs       integer[],
        used_roots       integer[],  -- one chord per scale degree
        used_basses      integer[],  -- one chord per bass note (no pedal points)
        unplaced_pins    text[],     -- floating pins not yet in this path
        score            numeric     -- see the formula in DECLARE; lower wins
    ) ON COMMIT DROP;

    -- seed with the start chord. Seeding from _vl_chords rather than the raw
    -- argument picks up the chord's root, and makes an unknown start chord an
    -- empty beam and hence no result.
    INSERT INTO _vl_paths
    SELECT chord_name, 0, 0, uses_extra_note::integer, 0, 0, root_note, 0,
           ARRAY[chord_name], ARRAY[0], ARRAY[root_note], ARRAY[root_note],
           array_remove(v_floating_pins, chord_name),  -- a pin equal to the start is already placed
           0
    FROM _vl_chords
    WHERE chord_name = p_start_chord;

    FOR v_step IN 2 .. GREATEST(p_length, 1) LOOP
        -- unpinned steps after this one. A path survives only while its
        -- unplaced pins still fit into them -- which is also what guarantees
        -- that every full-length path has placed all of its pins.
        v_open_steps_left := (p_length - v_step)
                           - (SELECT count(*)::integer
                              FROM unnest(v_pinned_at_step[v_step + 1 : p_length]) AS s
                              WHERE s IS NOT NULL);

        -- this step's required notes, and the note pool a free chord here may
        -- draw from (scale + extras + exactly these)
        SELECT COALESCE(array_agg(r.pitch_class), '{}') INTO v_step_required
        FROM _vl_required r WHERE r.at_step = v_step;
        v_step_pool := v_scale_pool || v_step_required;

        -- extend every kept path by one chord, score, keep the best. On a
        -- pinned step the only candidate is the pinned chord, and the
        -- distinct-root/distinct-bass rules are waived: the caller chose it.
        -- On a free step the move must be a real one (distance > 0), carry
        -- the step's required notes, and land on a fresh root and a fresh
        -- bass -- unless it places a floating pin, which may land anywhere
        -- (but still owes the required notes). The pool check keeps chords
        -- borrowing a required note out of the steps that didn't ask for it.
        -- random() runs in the inner query so the jitter and cap waivers
        -- stored on the row are the ones its score was built from.
        DROP TABLE IF EXISTS _vl_next_paths;
        CREATE TEMP TABLE _vl_next_paths ON COMMIT DROP AS
            SELECT x.*,
                   x.cost + x.jitter
                     - x.extra_note_count * c_extra_note_bonus
                     + cardinality(x.unplaced_pins) * c_unplaced_pin_penalty
                     + x.oversize * c_oversize_note_penalty
                     + x.root_penalty * p_root_weight
                     + x.bass_motion * p_slash_weight AS score
            FROM (
                SELECT m.to_chord                                              AS last_chord,
                       p.cost + m.vl_distance                                  AS cost,
                       p.jitter + random() * p_randomness * c_max_jitter_per_step AS jitter,
                       p.extra_note_count + m.to_uses_extra::integer           AS extra_note_count,
                       p.oversize + CASE WHEN m.to_oversize = 0 THEN 0
                                         WHEN random() < p_randomness THEN 0   -- cap waived
                                         ELSE m.to_oversize END                AS oversize,
                       p.root_penalty + fn_root_motion_penalty(m.from_root, m.to_root) AS root_penalty,
                       v.bass_note                                             AS bass,
                       p.bass_motion + fn_pitch_class_distance(p.bass, v.bass_note) AS bass_motion,
                       p.path        || v.voiced_name                          AS path,
                       p.step_costs  || m.vl_distance                          AS step_costs,
                       p.used_roots  || m.to_root                              AS used_roots,
                       p.used_basses || v.bass_note                            AS used_basses,
                       array_remove(p.unplaced_pins, m.to_chord)               AS unplaced_pins
                FROM _vl_paths p
                JOIN _vl_moves m    ON m.from_chord = p.last_chord
                JOIN _vl_voicings v ON v.chord_name = m.to_chord
                WHERE CASE
                    WHEN v_pinned_at_step[v_step] IS NOT NULL
                        THEN m.to_chord = v_pinned_at_step[v_step]
                    ELSE m.vl_distance > 0
                         AND v_step_required <@ m.to_notes
                         AND (   m.to_chord = ANY (p.unplaced_pins)
                              OR (    NOT (m.to_root   = ANY (p.used_roots))
                                  AND NOT (m.to_root   = ANY (v_reserved_roots))
                                  AND NOT (v.bass_note = ANY (p.used_basses))
                                  AND m.to_notes <@ v_step_pool))
                    END
            ) x
            WHERE cardinality(x.unplaced_pins) <= v_open_steps_left
            ORDER BY score
            LIMIT c_beam_width;

        DELETE FROM _vl_paths;
        INSERT INTO _vl_paths SELECT * FROM _vl_next_paths;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM _vl_paths);
    END LOOP;

    -- pick the best full-length path by the same score. Every pin must have
    -- been placed (guaranteed by the in-loop pruning for any path that took a
    -- step; checking it here also covers p_length = 1). When extra notes were
    -- requested, ask for a path that borrows one; if none survived the beam,
    -- fall back to the plain smoothest so a result is still returned.
    SELECT p.path, p.step_costs, p.cost
    INTO v_best_path, v_best_step_costs, v_best_cost
    FROM _vl_paths p
    WHERE array_length(p.path, 1) = p_length
      AND cardinality(p.unplaced_pins) = 0
      AND (cardinality(v_extra_pitch_classes) = 0 OR p.extra_note_count > 0)
    ORDER BY p.score
    LIMIT 1;

    IF v_best_path IS NULL AND cardinality(v_extra_pitch_classes) > 0 THEN
        SELECT p.path, p.step_costs, p.cost
        INTO v_best_path, v_best_step_costs, v_best_cost
        FROM _vl_paths p
        WHERE array_length(p.path, 1) = p_length
          AND cardinality(p.unplaced_pins) = 0
        ORDER BY p.score
        LIMIT 1;
    END IF;

    IF v_best_path IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT s.ord::integer, s.chord_name, v_best_step_costs[s.ord::integer], v_best_cost
    FROM unnest(v_best_path) WITH ORDINALITY AS s(chord_name, ord)
    ORDER BY s.ord;
END;
$$;
