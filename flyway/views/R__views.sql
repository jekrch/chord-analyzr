
--
-- CHORDS --
--

DROP VIEW IF EXISTS mode_scale_chord_relation_view;
DROP VIEW IF EXISTS chord_view;
DROP VIEW IF EXISTS chord_note_view;

-- fetches all permutations of chord types with root notes 

CREATE OR REPLACE VIEW chord_note_view AS 
SELECT 
    n.note AS note,
    n.name AS note_name, 
    ct.name AS chord_type,
    ct.id AS chord_type_id,
    n.name || ct.name as chord_name,
    (ctn.note + n.note) as chord_note,
    chord_note.name as chord_note_name 
FROM chord_type_note ctn 
JOIN chord_type ct ON ct.id = ctn.chord_type_id
JOIN note n ON true
JOIN note chord_note ON chord_note.note = 
    (
        CASE WHEN (ctn.note + n.note) = 12 
            THEN 12
        ELSE (ctn.note + n.note) % 12 END
    ) AND 
    chord_note.note_type_id IN (1,3);
    
    
-- fetches all permutations of chord types with root notes 
-- and displays aggregated csv of the containing notes 

CREATE OR REPLACE VIEW chord_view AS 
SELECT 
    cnv.note,
    cnv.note_name, 
    cnv.chord_type,
    cnv.chord_name,
    string_agg(cnv.chord_note_name, ', '  order by cnv.chord_note) chord_note_names, 
    string_agg(cnv.chord_note::text, ', ' order by cnv.chord_note) chord_notes
FROM chord_note_view cnv 
GROUP BY cnv.note, cnv.note_name, cnv.chord_type, cnv.chord_name;


--
-- MODES --
--

DROP VIEW IF EXISTS mode_view;
DROP VIEW IF EXISTS mode_note_view;

-- fetches all permutations of modes with keys

CREATE OR REPLACE VIEW mode_note_view AS
SELECT m.id AS mode_id,
       m.name AS mode,
       root_note.note AS key_note, 
       root_note.name AS key_name,
       n.name AS note_name,
       (mn.note + root_note.note) AS seq_note,
       (
           CASE WHEN (mn.note + root_note.note) = 12 
             THEN 12
           ELSE (mn.note + root_note.note) % 12 END
       ) AS note,
       mn.note_ordinal AS note_ordinal
FROM mode m 
JOIN mode_note mn on mn.mode_id = m.id
JOIN note root_note on true 
JOIN note n ON n.note = 
    (
        CASE WHEN (mn.note + root_note.note) = 12 
             THEN 12
        ELSE (mn.note + root_note.note) % 12 END
    )
    AND n.note_type_id IN (1,3);

    
    -- recursive view for getting order of note letters in continuous sequence
CREATE OR REPLACE VIEW ordered_letter_view AS 
WITH RECURSIVE letters AS (
    SELECT letter_ordinal, letter  
    FROM letter l
    UNION ALL
    SELECT l.letter_ordinal + 7, l2.letter 
    FROM letter l2 
    JOIN letters l ON l.letter = l2.letter
)
SELECT * FROM letters
LIMIT 1000; -- courtesy limit 

-- gets the letter proceeding and preceding each note letter 
CREATE OR REPLACE VIEW adjacent_letter_view AS 
SELECT l.letter_ordinal, 
         l.letter, 
         pre_l.letter AS antecedent_letter, 
         post_l.letter AS subsequent_letter 
FROM letter l
JOIN ordered_letter_view pre_l ON (l.letter_ordinal = 1 AND pre_l.letter_ordinal = 7) OR -- if A make the preceding letter G
                                                (pre_l.letter_ordinal = l.letter_ordinal - 1) 
JOIN ordered_letter_view post_l ON (post_l.letter_ordinal = l.letter_ordinal + 1) -- get the subsequent 
ORDER BY l.letter_ordinal asc;



-- get note numbers for every scale in every key 
-- (excluding keys that have a tonic with two or more sharps or flats)
CREATE OR REPLACE VIEW mode_scale_note_view AS 
 SELECT 
    m.id AS mode_id,
    m.name AS mode,
    root_note.note AS key_note,
    root_note.name AS key_name,
    root_note.letter AS key_letter,
    root_note.note_type_id AS key_type_id,
    mn.note + root_note.note AS seq_note,   -- seq_note can go over 12, while note below stays within 1-12 
        CASE
            WHEN (mn.note + root_note.note) = 12 
                THEN 12
            ELSE (mn.note + root_note.note) % 12
        END AS note,
    mn.note_ordinal,                        -- index from 1
    (mn.note_ordinal - 1) AS note_index     -- add an index from 0 for calculations 
   FROM mode m
     JOIN mode_note mn ON mn.mode_id = m.id
     JOIN note root_note ON TRUE AND                                        
                              root_note.note_type_id NOT IN (4,5); -- exclude the double sharps flats
     
     

CREATE OR REPLACE VIEW mode_scale_note_letter_view AS 
SELECT msn.mode_id,
         msn.mode,
         msn.key_note, 
         msn.key_name,
         msn.note_ordinal,
         msn.note,
         nt.name AS note_name, 
        nt.note_type_id, 
        nt.letter AS note_letter,
         msn.key_letter,
         msn.key_type_id, 
         msn.seq_note
FROM mode_scale_note_view msn
JOIN note nt ON nt.name IN (
    SELECT n.name 
        FROM note n
        JOIN ordered_letter_view olv_key_ordinal 
                ON olv_key_ordinal.letter = msn.key_letter
        JOIN ordered_letter_view olv_seq_letter       -- the letter of the preceding note should be the 
                ON olv_seq_letter.letter_ordinal =    -- the index of the note within the scale should determine the letter 
                                            (olv_key_ordinal.letter_ordinal + msn.note_index) AND 
                   olv_seq_letter.letter = n.letter
        WHERE n.note = msn.note
)
ORDER BY msn.note_ordinal ASC;




-- fetches all permutations of modes with keys 
-- and displays aggregated csv of the containing notes 

CREATE OR REPLACE VIEW mode_view AS
SELECT 
       msn.mode, 
       msn.key_note, 
       msn.key_name,
       string_agg(msn.note_name, ', '  order by msn.note_ordinal) AS mode_note_names, 
       string_agg(seq_note::text, ', ' order by msn.note_ordinal) AS mode_notes
FROM mode_scale_note_letter_view msn
GROUP BY msn.mode, msn.key_note, msn.key_name;



--
-- CHORD-SCALE RELATIONSHIPS --
--

    
-- fetches all chord-mode-key permutations with any distinct notes listed and counted. 
-- this can be used to identify the affinity of chords to a given scale 
CREATE OR REPLACE VIEW mode_scale_chord_relation_view AS
WITH chord_notes AS (
 SELECT 
    cnv.note,
    cnv.note_name,
    cnv.chord_type_id,
    cnv.chord_type,
    cnv.chord_name,
    array_agg(
         DISTINCT 
            CASE WHEN cnv.chord_note = 12 
            THEN cnv.chord_note 
            ELSE cnv.chord_note % 12 END
    ) AS chord_notes,
    COUNT(cnv.chord_note) AS note_count
    FROM chord_note_view cnv
    GROUP BY cnv.note, cnv.note_name, cnv.chord_type, 
             cnv.chord_name, cnv.chord_type_id
), mode_notes AS (
 SELECT   
   mnv.mode_id,  
    mnv.mode,
    mnv.key_note,
    mnv.key_name,
    array_agg(DISTINCT mnv.note) AS mode_notes
    FROM mode_note_view mnv 
    GROUP BY mnv.key_note, mnv.key_name, mnv.mode, mnv.mode_id
), mode_chord_notes AS (

 SELECT 
    mn.mode_id,
    mn.mode, 
    mn.key_note, 
    mn.key_name, 
    cn.note_name,
    cn.chord_type_id,
    cn.chord_name, 
    mn.mode_notes,
    cn.chord_notes,
    ARRAY(select unnest(cn.chord_notes) EXCEPT select unnest(mn.mode_notes)) AS diff
    FROM mode_notes mn 
    JOIN chord_notes cn ON TRUE 
)
SELECT DISTINCT
    mcn.mode_id,
    mcn.mode, 
    mcn.key_note, 
    mcn.key_name, 
    n.note AS chord_note,
    mcn.note_name chord_note_name,
    mcn.chord_type_id, 
    mcn.chord_name,
    mcn.mode_notes,
    mcn.chord_notes,
    diff AS mode_chord_note_diff, 
    COALESCE(array_length(mcn.diff, 1), 0) AS mode_chord_note_diff_count
FROM mode_chord_notes mcn
JOIN note n ON n.name = mcn.note_name                 
LEFT JOIN mode_scale_note_letter_view msnlv ON    -- get the chord note's preferred 
    msnlv.mode = mcn.mode AND                     -- mode scale name if one exists 
    msnlv.key_name = mcn.key_name AND 
    msnlv.note = n.note AND 
    mcn.note_name = msnlv.note_name         
WHERE 
(
    NOT(n.note = ANY(mcn.mode_notes::BIGINT[])) OR -- if the chord note is within the selected 
    msnlv.note_name = n.name                       -- mode scale, use the preferred note name
) AND
(                                                  -- only allow chord notes with double sharps/flats
    msnlv.note_name != NULL OR                     -- if they're within the selected mode scale
    n.note_type_id NOT IN (4,5)
);