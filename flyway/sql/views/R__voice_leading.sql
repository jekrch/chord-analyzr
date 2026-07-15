--
-- VOICE LEADING & HARMONIC PATHFINDING --
--
-- Turns the chord/scale relational model into a *weighted graph* and does
-- shortest-path search over it, so the database can answer questions that are
-- too combinatorially large to precompute into static JSON, e.g.
--
--   "I'm in C Ionian, I just played Cmaj7 -- give me the smoothest 4-chord
--    progression from here."
--
-- Nodes  = chords (their pitch-class sets, from chord_view.chord_note_array)
-- Edges  = voice-leading distance between two chords
-- Weight = minimal total semitone motion to move one chord's notes to another's
--
-- This runs after R__views.sql (repeatable migrations execute in description
-- order: "views" < "voice_leading"), so chord_view / mode_notes_mv exist.
--
-- Two properties keep the graph clean and the search tractable:
--   * Nodes are canonicalised to the scale's own spelling of each root, so a
--     single mode+key yields ~100 real chords, not the ~300 that appear once
--     every enharmonic root spelling (Abb6, F##7, ...) is included.
--   * Edges with zero voice-leading distance are dropped. A zero-distance edge
--     joins two chords with the *same pitch-class set* under different names
--     (C6 vs Am7); treating those as a "move" lets a path take free non-steps.

-- DROP VIEW IF EXISTS mode_key_chord_edge_view;
-- DROP VIEW IF EXISTS mode_key_chord_view;
-- DROP FUNCTION IF EXISTS fn_smooth_progression(text, text, text, integer, numeric, text[], numeric, numeric, text[], integer[]);
-- DROP FUNCTION IF EXISTS fn_voice_leading_distance(integer[], integer[]);
-- DROP FUNCTION IF EXISTS fn_root_motion_penalty(integer, integer);
-- DROP FUNCTION IF EXISTS fn_pitch_class_distance(integer, integer);


-- Shortest distance in semitones between two pitch classes on the chroma
-- circle. Pitch classes are 1..12 (C=1 ... B=12), matching note.note.
-- Range: 0 (unison) .. 6 (tritone).  e.g. C(1)->B(12) = 1, C(1)->F#(7) = 6.
CREATE OR REPLACE FUNCTION fn_pitch_class_distance(a integer, b integer)
RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT LEAST(d, 12 - d) FROM (SELECT abs(a - b) % 12 AS d) t;
$$;


-- Functional strength of a root move, expressed as a penalty (lower = stronger,
-- more purposeful). Voice-leading distance alone rewards the smallest note
-- motion, which tends to wander through chromatic-mediant / shared-tone moves
-- with no harmonic pull -- the "jagged and awkward" failure mode. Blending this
-- penalty into the search's ordering key biases it toward moves that sound
-- intentional, above all the descending-fifth motion that drives functional
-- progressions.
--
-- Keyed on the ascending interval i = (to - from) mod 12 between the two roots
-- (pitch classes 1..12; the constant 1-based offset cancels in the difference):
--   i = 5  down a P5 / up a P4     -> 0   the backbone (ii-V-I, circle of 5ths)
--   i = 2  up a whole step         -> 1   IV-V and friends
--   i = 8  down a major 3rd        -> 1   descending-third chains (I-vi-IV...)
--   i = 9  down a minor 3rd        -> 1
--   i = 1/3/10/11  half/whole/m3   -> 2   plausible but weaker
--   i = 4  up a major 3rd          -> 3   ascending third, weak
--   i = 7  up a P5 / down a P4     -> 3   retrogression
--   i = 6  tritone                 -> 3
--   i = 0  same root               -> 4   (barred by the distinct-root rule)
CREATE OR REPLACE FUNCTION fn_root_motion_penalty(from_root integer, to_root integer)
RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT CASE (to_root - from_root + 12) % 12
        WHEN 5  THEN 0
        WHEN 2  THEN 1
        WHEN 8  THEN 1
        WHEN 9  THEN 1
        WHEN 1  THEN 2
        WHEN 3  THEN 2
        WHEN 10 THEN 2
        WHEN 11 THEN 2
        WHEN 4  THEN 3
        WHEN 7  THEN 3
        WHEN 6  THEN 3
        ELSE 4
    END;
$$;


-- Voice-leading distance between two chords, each given as a pitch-class set.
-- Symmetric nearest-neighbour metric: for every note in each chord, find the
-- closest note in the other chord, sum those minimal moves, and take the
-- larger of the two directed sums. Common tones cost 0, so the metric rewards
-- shared notes and small stepwise motion -- i.e. smooth voice leading. It is
-- octave-agnostic (pitch-class space) and handles chords of different sizes.
--
-- Note: distance is 0 iff the two pitch-class sets are identical, so the edge
-- view below uses "> 0" to exclude same-set/different-name chord pairs.
--
-- Validated against known cases: C->Em = 1, C->Am = 2, C->Ab = 2 (chromatic
-- mediant), F->G = 5 (parallel, no common tones).
CREATE OR REPLACE FUNCTION fn_voice_leading_distance(chord_a integer[], chord_b integer[])
RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT GREATEST(
        (SELECT COALESCE(SUM(nearest), 0)
         FROM (SELECT MIN(fn_pitch_class_distance(x, y)) AS nearest
               FROM unnest(chord_a) AS x CROSS JOIN unnest(chord_b) AS y
               GROUP BY x) src),
        (SELECT COALESCE(SUM(nearest), 0)
         FROM (SELECT MIN(fn_pitch_class_distance(x, y)) AS nearest
               FROM unnest(chord_a) AS x CROSS JOIN unnest(chord_b) AS y
               GROUP BY y) tgt)
    );
$$;


-- The diatonic chord set for every mode+key: chords whose every note falls
-- within the scale. This is the diff_count = 0 slice of
-- mode_scale_chord_relation_view, exposed with the pitch-class array attached
-- so it can serve as the node set of the graph.
--
-- Roots are canonicalised: a chord is kept only when its root is spelled the
-- way this mode+key spells that pitch class (join to mode_scale_note_letter_mv).
-- chord_view enumerates a chord under every enharmonic root spelling of its
-- pitch class (G6, Abb6, F##6, ...); this keeps just the scale-correct one.
CREATE OR REPLACE VIEW mode_key_chord_view AS
SELECT
    mn.mode_id,
    mn.mode,
    mn.key_name,
    cv.chord_name,
    cv.note              AS root_note,
    cv.chord_note_array  AS chord_notes
FROM mode_notes_mv mn
JOIN chord_view cv
    ON cv.note = ANY (mn.mode_notes)                 -- chord root is in the scale
JOIN mode_scale_note_letter_mv rs                    -- and spelled as the scale spells it
    ON  rs.mode_id   = mn.mode_id
    AND rs.key_name  = mn.key_name
    AND rs.note      = cv.note
    AND rs.note_name = cv.note_name
WHERE NOT EXISTS (                                   -- and no chord note falls outside the scale
    SELECT 1
    FROM unnest(cv.chord_note_array) AS cn
    WHERE cn <> ALL (mn.mode_notes)
);


-- The weighted graph: every ordered pair of in-scale chords in a given
-- mode+key, with their voice-leading distance. Kept as a plain view (not
-- materialised) so it is computed on demand for a single mode+key -- the full
-- all-pairs product across every key would be large and is never needed at once.
--
-- Zero-distance edges are excluded: distance 0 means the two chords are the
-- same pitch-class set spelled differently (C6 / Am7), which is a naming
-- choice, not a voice-leading move.
--
-- Kept as a straightforward self-join (rather than computing the symmetric
-- upper triangle once via a CTE) specifically so the caller's
-- WHERE mode = ... AND key_name = ... predicate pushes down into the join and
-- only one mode+key's ~100 nodes are ever paired. A materialised CTE would be
-- an optimisation fence and force the full all-keys product to compute first.
CREATE OR REPLACE VIEW mode_key_chord_edge_view AS
SELECT
    e.mode_id,
    e.mode,
    e.key_name,
    e.from_chord,
    e.from_notes,
    e.to_chord,
    e.to_notes,
    e.vl_distance
FROM (
    SELECT
        a.mode_id,
        a.mode,
        a.key_name,
        a.chord_name  AS from_chord,
        a.chord_notes AS from_notes,
        b.chord_name  AS to_chord,
        b.chord_notes AS to_notes,
        fn_voice_leading_distance(a.chord_notes, b.chord_notes) AS vl_distance
    FROM mode_key_chord_view a
    JOIN mode_key_chord_view b
        ON  a.mode_id  = b.mode_id
        AND a.key_name = b.key_name
        AND a.chord_name <> b.chord_name
) e
WHERE e.vl_distance > 0;


-- fn_chord_path (minimum-cost path between two chords) used to live here; it
-- was removed because the query it answers is degenerate. Voice-leading
-- distance behaves like a metric on a near-complete graph, so the cheapest
-- unconstrained path from A to B is (almost) always the direct edge A -> B --
-- the function just echoed its two inputs back. The rare multi-step results
-- were triangle-inequality artifacts of the nearest-neighbour metric, not
-- musical waypoints. "Get me from A to B smoothly" needs a constraint that
-- forces intermediate motion (fixed length + distinct roots, as
-- fn_smooth_progression does); an end-anchored variant of that beam search is
-- the useful replacement if the need returns.
DROP FUNCTION IF EXISTS fn_chord_path(text, text, text, text, integer);


-- Generate the smoothest chord progression of a given length that starts on a
-- given chord and stays within mode+key -- the minimum total voice-leading
-- path of exactly p_length chords beginning at p_start_chord, with each chord
-- on a distinct scale degree (root).
--
-- The distinct-root rule is what makes the output a *progression* rather than a
-- degenerate result. Without it, minimising total voice-leading motion has a
-- trivial optimum: the graph carries many near-identical variants of each root
-- (C, C6, Csus4, Cadd(4)...), one semitone apart, so the "smoothest" path just
-- wiggles among voicings of a single chord and never moves harmonically
-- (Cmaj7 -> C -> Csus4 -> Cadd(4)). Requiring a new root at every step forces
-- the progression to actually travel through the scale's degrees while still
-- choosing the smoothest voice leading between them. Because a mode has 7
-- degrees, p_length > 7 has no result.
--
-- Fixed-length minimum-weight path is combinatorial, so this is a beam search:
-- at each step it extends every partial progression by one chord (on an unused
-- root) and keeps the cheapest c_beam_width of them. The beam is wide relative
-- to the ~100-node graph, so results are optimal or near-optimal for the modest
-- lengths this is used with, while staying linear in length.
--
--   SELECT * FROM fn_smooth_progression('Ionian', 'C', 'Cmaj7', 4);
--   -> Cmaj7, Em7, G7, Bm7b5 (or similar) instead of Cmaj7, C, Csus4, Cadd(4)
--
-- Two optional knobs vary and colour the output; both default to the original
-- deterministic, strictly-in-scale behaviour:
--
--   p_randomness (0..1, default 0) adds random jitter to the search's ordering
--   key, so the beam keeps -- and the final pick chooses among -- near-smoothest
--   paths rather than always the single cheapest. 0 is fully deterministic;
--   higher loosens the "smoothest" bias for more variety. It only perturbs the
--   *ordering*; the reported vl costs are always the true voice-leading motion.
--
--   p_extra_notes (note names, default none) lets chords borrow notes from
--   outside the scale -- secondary dominants, borrowed/altered colour, etc.
--   Notes are given by name ('F#', 'Bb', 'Ab', ...) in standard spelling
--   (uppercase letter, '#' sharp, 'b' flat) and resolved to pitch classes via
--   the note table, so any enharmonic spelling of the same pitch works. Chords
--   keep diatonic, scale-spelled roots (so the graph stays free of enharmonic-
--   duplicate roots), but a chord may now include the listed non-scale notes as
--   chord tones. Such chords cost more voice leading, so a plain minimiser would
--   never use them; a per-chord ordering bonus pulls them in, and the final pick
--   requires at least one borrowed chord to appear -- so the colour lands
--   somewhere in the progression without being forced onto every chord. If no
--   coloured path survives the beam, it falls back to the smoothest path so a
--   result is still returned. Names that don't resolve are ignored.
--
--   SELECT * FROM fn_smooth_progression('Ionian', 'C', 'Cmaj7', 4, 0.5, ARRAY['F#']);
--
--   p_root_weight (>= 0, default 0) blends functional root motion into the
--   search. At 0 the search minimises pure voice-leading motion, which tends to
--   wander through smooth-but-aimless chromatic-mediant / shared-tone moves --
--   the usual source of "jagged and awkward" output. Raising it adds
--   fn_root_motion_penalty (scaled by this weight) to the ordering key, so the
--   beam prefers purposeful root motion -- above all the descending fifth -- for
--   the same voice-leading budget. The reported vl costs are unchanged; only the
--   choice among near-equal-smoothness paths shifts. Try 1-3 to start; higher
--   privileges strong functional motion over the very smoothest voice leading.
--
--   SELECT * FROM fn_smooth_progression('Ionian', 'C', 'Cmaj7', 4, 0, '{}', 2);
--
--   p_slash_weight (>= 0, default 0) turns on slash chords / inversions. At 0
--   every chord is voiced in root position and the output is unchanged. Above 0
--   each chord may instead be voiced over any of its scale-tone chord tones in
--   the bass (Cmaj7 -> Cmaj7/E, Cmaj7/G, ...), and the search penalises bass
--   leaps -- the summed semitone motion of the bass line -- scaled by this
--   weight. So inversions are chosen exactly where they smooth (or pedal) the
--   bass, the main reason to reach for a slash chord. It composes with
--   p_root_weight: root weight shapes the functional skeleton, slash weight then
--   picks inversions that give that skeleton a singable bass line. Try 1-3.
--   Reported vl costs stay the pitch-class voice-leading motion (bass choice
--   never changes the note set, only which tone is lowest).
--
--   SELECT * FROM fn_smooth_progression('Ionian', 'C', 'Cmaj7', 5, 0, '{}', 2, 2);
--
--   p_pinned_chords / p_pinned_positions (default none) pin further chords into
--   the progression, which the search then builds around -- the remaining steps
--   are filled with the smoothest in-scale choices given the pins. The arrays
--   are parallel: p_pinned_positions[i] fixes p_pinned_chords[i] at that step
--   (1-based, matching the output's step column); a missing/NULL/out-of-range
--   position -- or step 1, which always belongs to p_start_chord -- leaves the
--   pin floating, to be placed wherever it costs least. Pins are exempt from
--   the distinct-root and distinct-bass rules (the caller chose them, so they
--   may revisit a degree), while their degrees are reserved for them: a filler
--   chord never sits on a pinned chord's root, so the pin's arrival stays a
--   real harmonic move. A pin whose name resolves to no known chord is
--   dropped, like an unresolvable extra note. Pinning more chords than the
--   progression has open steps yields no result.
--
--   SELECT * FROM fn_smooth_progression('Ionian', 'C', 'Cmaj7', 4,
--       p_pinned_chords => ARRAY['Am7', 'G7'], p_pinned_positions => ARRAY[NULL, 3]);
--
-- The start chord and the pinned chords are taken as given even when they use
-- notes outside the mode (a secondary dominant, a borrowed chord, ...): any
-- chord known to chord_view may be requested and is injected into the graph
-- as-is, its non-scale tones and all. Only the *unrequested* chords -- the ones
-- the search fills in -- are held to the mode (plus p_extra_notes).

-- The signature grew (p_randomness and p_extra_notes, then the pinned-chord
-- pair); drop the prior overloads so shorter calls -- e.g. the 8-arg one in
-- ProgressionRepository -- resolve unambiguously to the new definition via its
-- defaults, and the earlier integer[] extra-notes version does not linger
-- alongside the text[] one. No-op on a first deploy.
DROP FUNCTION IF EXISTS fn_smooth_progression(text, text, text, integer);
DROP FUNCTION IF EXISTS fn_smooth_progression(text, text, text, integer, numeric, integer[]);
DROP FUNCTION IF EXISTS fn_smooth_progression(text, text, text, integer, numeric, text[]);
DROP FUNCTION IF EXISTS fn_smooth_progression(text, text, text, integer, numeric, text[], numeric);
DROP FUNCTION IF EXISTS fn_smooth_progression(text, text, text, integer, numeric, text[], numeric, numeric);

CREATE OR REPLACE FUNCTION fn_smooth_progression(
    p_mode         text,
    p_key          text,
    p_start_chord  text,
    p_length       integer,
    p_randomness   numeric DEFAULT 0,
    p_extra_notes  text[]  DEFAULT '{}',
    p_root_weight  numeric DEFAULT 0,
    p_slash_weight numeric DEFAULT 0,
    p_pinned_chords    text[]    DEFAULT '{}',
    p_pinned_positions integer[] DEFAULT '{}'
)
RETURNS TABLE(step integer, chord text, vl_from_prev integer, total_cost integer)
LANGUAGE plpgsql VOLATILE
AS $$
DECLARE
    c_beam_width   CONSTANT integer := 500;
    c_random_scale CONSTANT numeric := 6;   -- max jitter added per step at p_randomness = 1
    c_extra_bonus  CONSTANT numeric := 6;   -- ordering discount per chord that borrows an extra note
    c_pin_bonus    CONSTANT numeric := 6;   -- ordering discount per floating pin already placed
    v_step       integer;
    v_extra_pc   integer[];               -- p_extra_notes resolved to pitch classes
    v_pin        text;
    v_pos        integer;
    v_forced     text[];                  -- pinned chord per step; NULL = the search chooses
    v_any_pins   text[];                  -- pinned chords with no fixed step ("floating")
    v_requested  text[];                  -- chords that must exist as nodes even out of scale
    v_pin_roots  integer[];               -- pinned chords' roots, reserved for the pins
    v_free_left  integer;                 -- unpinned steps remaining after the current one
    v_best_path  text[];
    v_best_costs integer[];
    v_best_cost  integer;
BEGIN
    -- resolve the requested note names to pitch classes (any enharmonic spelling
    -- of a pitch maps to the same class); unrecognised names simply drop out
    SELECT COALESCE(array_agg(DISTINCT n.note), '{}')
    INTO v_extra_pc
    FROM unnest(p_extra_notes) AS en
    JOIN note n ON n.name = btrim(en);

    -- sort the pinned chords into step-anchored ones (v_forced[step]) and
    -- floating ones (v_any_pins). A position is honoured when it names an open
    -- step in 2..p_length -- step 1 belongs to p_start_chord, and a step can
    -- only be pinned once -- otherwise the pin floats. Duplicate floats collapse.
    v_forced   := array_fill(NULL::text, ARRAY[GREATEST(p_length, 1)]);
    v_any_pins := '{}';
    FOR i IN 1 .. COALESCE(cardinality(p_pinned_chords), 0) LOOP
        v_pin := btrim(p_pinned_chords[i]);
        CONTINUE WHEN v_pin IS NULL OR v_pin = '';
        v_pos := p_pinned_positions[i];
        IF v_pos BETWEEN 2 AND p_length AND v_forced[v_pos] IS NULL THEN
            v_forced[v_pos] := v_pin;
        ELSIF NOT (v_pin = ANY (v_any_pins)) THEN
            v_any_pins := v_any_pins || v_pin;
        END IF;
    END LOOP;

    -- materialise this mode+key's graph once. Nodes are pulled into a temp
    -- table *before* the edges are built rather than read from
    -- mode_key_chord_edge_view: that view is a self-join of the (expensive)
    -- node view, and the mode/key predicate does not push into both sides of
    -- the self-join, so the node view -- unnest + NOT EXISTS + three joins --
    -- would be recomputed per candidate pair instead of once. Materialising the
    -- ~100 nodes first makes the ~5k-pair distance pass a plain temp-table join.
    -- nodes carry their root (scale degree) so the beam can forbid revisiting one
    -- node set: in-scale chords, optionally widened to admit chords that also
    -- borrow one of the extra notes. Roots stay diatonic and scale-spelled (the
    -- join to mode_scale_note_letter_mv) so no enharmonic-duplicate roots enter
    -- the graph; only chord *tones* may reach outside the scale. uses_extra flags
    -- a chord that actually borrows a non-scale note. With no extra notes this
    -- is exactly the strict in-scale node set of mode_key_chord_view.
    DROP TABLE IF EXISTS _vl_nodes;
    CREATE TEMP TABLE _vl_nodes ON COMMIT DROP AS
        SELECT cv.chord_name,
               cv.note              AS root_note,
               cv.chord_note_array  AS chord_notes,
               EXISTS (
                   SELECT 1 FROM unnest(cv.chord_note_array) cn
                   WHERE cn = ANY (v_extra_pc)
               )                    AS uses_extra
        FROM mode_notes_mv mn
        JOIN chord_view cv
            ON cv.note = ANY (mn.mode_notes)                 -- root is a scale degree
        JOIN mode_scale_note_letter_mv rs                    -- spelled as the scale spells it
            ON  rs.mode_id   = mn.mode_id
            AND rs.key_name  = mn.key_name
            AND rs.note      = cv.note
            AND rs.note_name = cv.note_name
        WHERE mn.mode = p_mode AND mn.key_name = p_key
          AND NOT EXISTS (                                   -- every note in scale ∪ extras
              SELECT 1
              FROM unnest(cv.chord_note_array) cn
              WHERE cn <> ALL (mn.mode_notes)
                AND cn <> ALL (v_extra_pc)
          );

    -- the chords the caller demanded -- the start chord and every pin -- must
    -- exist as nodes even when they use notes outside the mode. Whatever
    -- chord_view knows under exactly that name is injected as-is: the caller
    -- asked for it, so neither scale membership nor the scale's spelling of the
    -- root is required of it. Everything else in the graph stays strictly in
    -- scale, so out-of-mode colour enters only where explicitly requested.
    -- Injecting before the edge build means these chords get edges like any
    -- other node: the search can leave an out-of-scale start chord and can
    -- reach a floating pin from anywhere.
    v_requested := array_remove(v_forced, NULL) || v_any_pins || ARRAY[p_start_chord];
    INSERT INTO _vl_nodes (chord_name, root_note, chord_notes, uses_extra)
    SELECT DISTINCT cv.chord_name, cv.note, cv.chord_note_array,
           EXISTS (SELECT 1 FROM unnest(cv.chord_note_array) cn
                   WHERE cn = ANY (v_extra_pc))
    FROM chord_view cv
    WHERE cv.chord_name = ANY (v_requested)
      AND NOT EXISTS (SELECT 1 FROM _vl_nodes n WHERE n.chord_name = cv.chord_name);

    -- a pin that resolves to no chord at all (a typo) is dropped rather than
    -- dead-ending the whole search, matching how p_extra_notes treats unknown
    -- names. An unknown *start* chord still yields no rows, as before.
    SELECT COALESCE(array_agg(p), '{}') INTO v_any_pins
    FROM unnest(v_any_pins) AS p
    WHERE EXISTS (SELECT 1 FROM _vl_nodes n WHERE n.chord_name = p);
    FOR i IN 2 .. GREATEST(p_length, 1) LOOP
        IF v_forced[i] IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM _vl_nodes n WHERE n.chord_name = v_forced[i]) THEN
            v_forced[i] := NULL;
        END IF;
    END LOOP;

    -- the pinned chords' scale degrees are reserved for the pins themselves.
    -- Pins are exempt from the distinct-root rule, and without this reservation
    -- the search exploits that: it parks a near-identical free chord on the
    -- pin's root just before the pin lands (G6 -> pinned G7), the degenerate
    -- wiggle the distinct-root rule exists to prevent. Reserving the root
    -- before placement is enough -- once a pin has landed its root is in the
    -- path's roots[] and the ordinary rule keeps free chords off it after.
    SELECT COALESCE(array_agg(DISTINCT n.root_note), '{}') INTO v_pin_roots
    FROM _vl_nodes n
    WHERE n.chord_name = ANY (array_remove(v_forced, NULL) || v_any_pins);

    -- edges carry both endpoints' roots (the destination's to keep roots
    -- distinct; both to score the root-motion penalty when extending a path) and
    -- whether the destination borrows a non-scale note (for the colour bonus)
    DROP TABLE IF EXISTS _vl_edges;
    CREATE TEMP TABLE _vl_edges ON COMMIT DROP AS
        WITH pair AS (
            SELECT a.chord_name AS from_chord, a.root_note AS from_root, a.uses_extra AS from_extra,
                   b.chord_name AS to_chord,   b.root_note AS to_root,   b.uses_extra AS to_extra,
                   fn_voice_leading_distance(a.chord_notes, b.chord_notes) AS vl_distance
            FROM _vl_nodes a
            JOIN _vl_nodes b ON a.chord_name < b.chord_name   -- unordered pairs, once each
        )
        SELECT from_chord, to_chord, from_root, to_root, to_extra, vl_distance FROM pair WHERE vl_distance > 0
        UNION ALL                                             -- emit both directions
        SELECT to_chord, from_chord, to_root, from_root, from_extra, vl_distance FROM pair WHERE vl_distance > 0;
    CREATE INDEX ON _vl_edges (from_chord);

    -- the bass options for each chord: how it may be voiced. Every chord always
    -- offers its root-position voicing; with p_slash_weight > 0 it also offers a
    -- slash voicing over each of its scale-tone chord tones (Cmaj7 -> Cmaj7/E,
    -- Cmaj7/G, ...). The beam branches over these when extending a path and the
    -- ordering key charges bass leaps, so an inversion is taken only where it
    -- gives a smoother bass. Edges stay keyed on the base chord (a voicing never
    -- changes the pitch-class set, hence never the voice-leading distance), so
    -- this adds no cost to the O(nodes^2) edge build -- the branching is confined
    -- to the beam. The join to mode_scale_note_letter_mv both spells the bass the
    -- way the scale spells it and restricts slash basses to scale tones (a
    -- borrowed non-scale chord tone has no scale spelling and is skipped).
    DROP TABLE IF EXISTS _vl_basses;
    CREATE TEMP TABLE _vl_basses ON COMMIT DROP AS
        SELECT chord_name, root_note AS bass_note, chord_name AS display_name
        FROM _vl_nodes                                        -- root position, always
        UNION ALL
        SELECT n.chord_name, cn, n.chord_name || '/' || rs.note_name
        FROM _vl_nodes n
        CROSS JOIN LATERAL unnest(n.chord_notes) AS cn
        JOIN mode_notes_mv mn
            ON mn.mode = p_mode AND mn.key_name = p_key
        JOIN mode_scale_note_letter_mv rs
            ON rs.mode_id = mn.mode_id AND rs.key_name = mn.key_name AND rs.note = cn
        WHERE p_slash_weight > 0 AND cn <> n.root_note;       -- inversions, when enabled
    CREATE INDEX ON _vl_basses (chord_name);

    DROP TABLE IF EXISTS _vl_frontier;
    CREATE TEMP TABLE _vl_frontier (
        current     text,            -- base chord (edge join key); path holds the voiced name
        cost        integer,         -- true total voice-leading motion so far
        rnd         numeric,         -- accumulated random jitter (0 when p_randomness = 0)
        extra_count integer,         -- chords so far that borrow a non-scale note
        root_pen    integer,         -- summed root-motion penalty (0 when p_root_weight = 0)
        bass        integer,         -- current bass pitch class (the last chord's lowest note)
        bass_pen    integer,         -- summed bass-line motion (0 when p_slash_weight = 0)
        path        text[],
        costs       integer[],
        roots       integer[],       -- scale degrees used so far, to keep them distinct
        basses      integer[],       -- bass notes used so far, kept distinct so the bass
                                     -- line moves rather than collapsing to a pedal point
        pins_left   text[]           -- floating pins not yet placed in this path
    ) ON COMMIT DROP;
    -- seed from the node row so we pick up the start chord's root (and so an
    -- unknown start chord yields an empty frontier -> no result, not a bad seed)
    INSERT INTO _vl_frontier
    SELECT chord_name, 0, 0, CASE WHEN uses_extra THEN 1 ELSE 0 END, 0, root_note, 0,
           ARRAY[chord_name], ARRAY[0], ARRAY[root_note], ARRAY[root_note],
           array_remove(v_any_pins, chord_name)   -- a pin equal to the start is already placed
    FROM _vl_nodes WHERE chord_name = p_start_chord;

    FOR v_step IN 2 .. GREATEST(p_length, 1) LOOP
        -- steps after this one that are not pinned to a chord. A path may only
        -- survive this step if its still-floating pins fit into those open
        -- steps -- this pruning is also what *guarantees* every full-length
        -- path has placed all of its pins (at length, zero open steps remain).
        v_free_left := (p_length - v_step)
                     - (SELECT count(*)::integer
                        FROM unnest(v_forced[v_step + 1 : p_length]) AS s
                        WHERE s IS NOT NULL);
        DROP TABLE IF EXISTS _vl_next;
        IF v_forced[v_step] IS NOT NULL THEN
            -- pinned step: every partial progression extends to exactly this
            -- chord. It joins through _vl_nodes rather than _vl_edges so a
            -- zero-distance move (same pitch-class set under another name)
            -- still works, and the distinct-root / distinct-bass rules are
            -- waived -- the caller chose this chord, so it may revisit a used
            -- degree or bass. Only an immediate repeat of the previous chord
            -- is refused.
            CREATE TEMP TABLE _vl_next ON COMMIT DROP AS
                SELECT current, cost, rnd, extra_count, root_pen, bass, bass_pen,
                       path, costs, roots, basses, pins_left
                FROM (
                    SELECT nxt.chord_name            AS current,
                           f.cost + d.vl             AS cost,
                           f.rnd + random() * p_randomness * c_random_scale           AS rnd,
                           f.extra_count + (CASE WHEN nxt.uses_extra THEN 1 ELSE 0 END) AS extra_count,
                           f.root_pen + fn_root_motion_penalty(cur.root_note, nxt.root_note) AS root_pen,
                           b.bass_note               AS bass,
                           f.bass_pen + fn_pitch_class_distance(f.bass, b.bass_note) AS bass_pen,
                           f.path  || b.display_name AS path,
                           f.costs || d.vl           AS costs,
                           f.roots || nxt.root_note  AS roots,
                           f.basses || b.bass_note   AS basses,
                           array_remove(f.pins_left, nxt.chord_name) AS pins_left
                    FROM _vl_frontier f
                    JOIN _vl_nodes cur ON cur.chord_name = f.current
                    JOIN _vl_nodes nxt ON nxt.chord_name = v_forced[v_step]
                    CROSS JOIN LATERAL (
                        SELECT fn_voice_leading_distance(cur.chord_notes, nxt.chord_notes) AS vl
                    ) d
                    JOIN _vl_basses b ON b.chord_name = nxt.chord_name
                    WHERE nxt.chord_name <> f.current
                ) x
                WHERE cardinality(x.pins_left) <= v_free_left
                ORDER BY cost + rnd - extra_count * c_extra_bonus
                         + cardinality(pins_left) * c_pin_bonus
                         + root_pen * p_root_weight + bass_pen * p_slash_weight
                LIMIT c_beam_width;
        ELSE
            -- free step: extend every partial progression by one chord on an
            -- unused root, then keep the cheapest c_beam_width by the ordering
            -- key below. A still-floating pin is exempt from the new-root /
            -- new-bass rules so it can always land. random() is evaluated once
            -- per row in the inner query so the same jitter value that lands
            -- in rnd is the one the outer ORDER BY sees.
            CREATE TEMP TABLE _vl_next ON COMMIT DROP AS
                SELECT current, cost, rnd, extra_count, root_pen, bass, bass_pen,
                       path, costs, roots, basses, pins_left
                FROM (
                    SELECT e.to_chord               AS current,   -- base chord, for the next edge join
                           f.cost + e.vl_distance    AS cost,
                           f.rnd + random() * p_randomness * c_random_scale         AS rnd,
                           f.extra_count + (CASE WHEN e.to_extra THEN 1 ELSE 0 END) AS extra_count,
                           f.root_pen + fn_root_motion_penalty(e.from_root, e.to_root) AS root_pen,
                           b.bass_note               AS bass,
                           f.bass_pen + fn_pitch_class_distance(f.bass, b.bass_note) AS bass_pen,
                           f.path  || b.display_name AS path,      -- the voiced (possibly slash) name
                           f.costs || e.vl_distance  AS costs,
                           f.roots || e.to_root      AS roots,
                           f.basses || b.bass_note   AS basses,
                           array_remove(f.pins_left, e.to_chord) AS pins_left
                    FROM _vl_frontier f
                    JOIN _vl_edges e ON e.from_chord = f.current
                    JOIN _vl_basses b ON b.chord_name = e.to_chord   -- branch over bass voicings
                    WHERE e.to_chord = ANY (f.pins_left)      -- a floating pin may land anywhere
                       OR (    NOT (e.to_root = ANY (f.roots))     -- others: a new scale degree,
                           AND NOT (e.to_root = ANY (v_pin_roots)) -- not one reserved for a pin,
                           AND NOT (b.bass_note = ANY (f.basses))) -- and a new bass note (no pedal)
                ) x
                WHERE cardinality(x.pins_left) <= v_free_left
                -- ordering key: true cost, plus random jitter, minus a bonus for
                -- borrowed colour so extra-note chords stay competitive in the beam,
                -- minus a bonus per placed pin so pin-early paths stay competitive,
                -- plus the root-motion penalty so purposeful root moves are preferred,
                -- plus the bass-line motion so smoother (slash) voicings are preferred
                ORDER BY cost + rnd - extra_count * c_extra_bonus
                         + cardinality(pins_left) * c_pin_bonus
                         + root_pen * p_root_weight + bass_pen * p_slash_weight
                LIMIT c_beam_width;
        END IF;

        DELETE FROM _vl_frontier;
        INSERT INTO _vl_frontier SELECT * FROM _vl_next;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM _vl_frontier);
    END LOOP;

    -- pick the best full-length progression by the same ordering key. Every
    -- floating pin must have been placed (the in-loop pruning guarantees this
    -- for any path that went through a step; the explicit check also covers
    -- p_length = 1, where the seed alone can't carry pins). When extra notes
    -- were requested, require at least one borrowed chord so the colour
    -- actually lands; if none survived the beam, fall back to the smoothest path.
    SELECT f.path, f.costs, f.cost
    INTO v_best_path, v_best_costs, v_best_cost
    FROM _vl_frontier f
    WHERE array_length(f.path, 1) = p_length
      AND cardinality(f.pins_left) = 0
      AND (cardinality(v_extra_pc) = 0 OR f.extra_count > 0)
    ORDER BY f.cost + f.rnd - f.extra_count * c_extra_bonus
             + f.root_pen * p_root_weight + f.bass_pen * p_slash_weight
    LIMIT 1;

    IF v_best_path IS NULL AND cardinality(v_extra_pc) > 0 THEN
        SELECT f.path, f.costs, f.cost
        INTO v_best_path, v_best_costs, v_best_cost
        FROM _vl_frontier f
        WHERE array_length(f.path, 1) = p_length
          AND cardinality(f.pins_left) = 0
        ORDER BY f.cost + f.rnd - f.extra_count * c_extra_bonus
                 + f.root_pen * p_root_weight + f.bass_pen * p_slash_weight
        LIMIT 1;
    END IF;

    IF v_best_path IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT t.ord::integer, t.chord, v_best_costs[t.ord::int], v_best_cost
    FROM unnest(v_best_path) WITH ORDINALITY AS t(chord, ord)
    ORDER BY t.ord;
END;
$$;
