
--
-- CHORDS --
--

DROP VIEW IF EXISTS chord_view;
DROP VIEW IF EXISTS chord_note_view;

-- fetches all permutations of chord types with root notes 

CREATE OR REPLACE VIEW chord_note_view AS 
SELECT 
    n.note AS note,
	n.name AS note_name, 
	ct.name AS chord_type,
	n.name || ct.name as chord_name,
	(ctn.note + n.note) as chord_note,
	chord_note.name as chord_note_name 
FROM chord_type_note ctn 
JOIN chord_type ct ON ct.id = ctn.chord_type_id
JOIN note n ON true
JOIN note chord_note ON chord_note.note = 
	(CASE WHEN (ctn.note + n.note) <= 12 THEN (ctn.note + n.note)
	ELSE (ctn.note + n.note) - 12 END)
	AND chord_note.note_type_id IN (1,3);
	
	
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
SELECT m.name AS mode,
	   root_note.note AS key_note, 
	   root_note.name AS key_name,
	   n.name AS note_name,
	   (mn.note + root_note.note) AS seq_note,
	   (
		CASE WHEN (mn.note + root_note.note) <= 12 
	 	  THEN (mn.note + root_note.note)
		ELSE (mn.note + root_note.note) - 12 END
	   ) AS note,
	   mn.note_ordinal AS note_ordinal
FROM mode m 
JOIN mode_note mn on mn.mode_id = m.id
JOIN note root_note on true 
JOIN note n ON n.note = 
	(
		CASE WHEN (mn.note + root_note.note) <= 12 
	 	  THEN (mn.note + root_note.note)
		ELSE (mn.note + root_note.note) - 12 END
	)
	AND n.note_type_id IN (1,3);


-- fetches all permutations of modes with keys
-- and displays aggregated csv of the containing notes 

CREATE OR REPLACE VIEW mode_view AS
SELECT mnv.mode, 
	   mnv.key_note, 
	   mnv.key_name,
	   string_agg(mnv.note_name, ', '  order by mnv.note_ordinal) AS mode_note_names, 
	   	string_agg(seq_note::text, ', ' order by mnv.note_ordinal) AS mode_notes
FROM mode_note_view mnv
GROUP BY mnv.mode, mnv.key_note, mnv.key_name;
