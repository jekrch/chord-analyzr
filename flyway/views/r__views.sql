
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


-- WIP views for listing correct note names given a certain key and mode 

DROP VIEW IF EXISTS mode_key_note_view;
DROP VIEW IF EXISTS scale_note_type_view; 

CREATE OR REPLACE VIEW scale_note_type_view AS 
SELECT  DISTINCT ON (key_name, mode) key_name, 
	MODE, 
	CASE WHEN key_type_id = 1 THEN type_id 
	 ELSE key_type_id 
	END AS type_id--, COUNT(DISTINCT scales.letter)   --, --COUNT(DISTINCT scales.letter) AS letter_count
FROM ( 
SELECT 3 AS type_id, n_with_sharps.note, key_name, key_type_id, mode, letter, note_ordinal
FROM mode_base_note_view mbn
JOIN note n_with_sharps ON n_with_sharps.name IN (
			  SELECT n.name FROM note n WHERE
			  n.note = mbn.note AND 	
			  (
			  		mbn.note_ordinal != 1 OR 
					n.name = mbn.key_name
			  ) AND
			  (n.note_type_id = 1 OR 
				n.note_type_id = 3)
				ORDER BY n.note_type_id DESC LIMIT 1
			)
UNION 
SELECT 2 AS type_id, n_with_flats.note, key_name, key_type_id, mode, letter, note_ordinal
FROM mode_base_note_view mbn
JOIN note n_with_flats ON n_with_flats.name IN (
			  SELECT n.name FROM note n WHERE
			  n.note = mbn.note AND 	
			  (
			  		mbn.note_ordinal != 1 OR 
					n.name = mbn.key_name
			  ) AND
			  (n.note_type_id = 1 OR 
				n.note_type_id = 2)
				ORDER BY n.note_type_id ASC LIMIT 1
			)
) scales
GROUP BY key_name, key_type_id, type_id, mode 
ORDER BY key_name, MODE, COUNT(DISTINCT scales.letter) DESC, 
			CASE WHEN key_type_id = 1 THEN type_id END DESC, 
			CASE WHEN key_type_id != 1 THEN type_id END ASC;
			
			
CREATE OR REPLACE VIEW mode_key_note_view AS 
SELECT nt.name, 
	    nt.note_type_id, 
	    nt.letter,
		 mbn.* 
FROM mode_base_note_view mbn
JOIN scale_note_type_view snt ON 
					 snt.mode = mbn.mode AND 
					 snt.key_name = mbn.key_name
JOIN note nt ON nt.name in
	(
		SELECT n.name 
		FROM note n
		WHERE n.note = mbn.note AND 	
			  (
			  		mbn.note_ordinal != 1 OR 
					n.name = mbn.key_name
			  ) AND
			  (
			  		n.note_type_id = snt.type_id OR 
					n.note_type_id = 1
			  ) AND
		      n.letter not in  
				 (
					 SELECT n2.letter
					 FROM mode_base_note_view mbn2 
					 JOIN note n2 ON n2.note = mbn2.note
					 WHERE mbn2.note_ordinal < mbn.note_ordinal AND 
						    mbn2.mode = mbn.mode AND 
							 mbn2.key_name = mbn.key_name AND 	
			  				(
							  mbn2.note_ordinal != 1 OR 
							  n2.name = mbn2.key_name
							) AND
			  				( 
							  n2.note_type_id = snt.type_id OR 
							  n2.note_type_id = 1) AND
			  				(
							  n2.note_type_id = 1 OR 
							  n2.note_type_id = mbn2.key_type_id 
							) 
				 ) AND 
				 (
				 	 n.note_type_id = mbn.key_type_id OR 
					 n.note_type_id = snt.type_id OR 
					 n.note_type_id = 1
				 )
		
				ORDER BY snt.type_id = n.note_type_id LIMIT 1
	);
	
	