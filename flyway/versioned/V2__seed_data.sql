
INSERT INTO public.note_type(id, name)
  VALUES
	(1, 'natural'), 
	(2, 'flat'), 
	(3, 'sharp');


INSERT INTO note(letter, name, note, note_type_id)
  VALUES 
    ('C', 'Cb', 12, 2),
	('C', 'C', 1, 1),
	('C', 'C#', 2, 3),
	('D', 'Db', 2, 2),
	('D', 'D', 3, 1),
	('D', 'D#', 4, 3),
	('E', 'Eb', 4, 2),
	('E', 'E', 5, 1),
	('E', 'E#', 6, 3),
	('F', 'Fb', 5, 2),
	('F', 'F', 6, 1),
	('F', 'F#', 7, 3),
	('G', 'Gb', 7, 2),
	('G', 'G', 8, 1),
	('G', 'G#', 9, 3),
	('A', 'Ab', 9, 2),
	('A', 'A', 10, 1),
	('A', 'A#', 11, 3),
	('B', 'Bb', 11, 2),
	('B', 'B', 12, 1),
	('B', 'B#', 1, 3);
	

-- Insert chord types via function 

-- If the provided chord type name doesn't exist, create it and 
-- insert provided notes in chord_type_note
CREATE OR REPLACE FUNCTION fn_insert_chord_type_if_not_exists(
	v_chord_type_name varchar, 
	v_chord_type_notes integer[])
returns VOID
language plpgsql
as
$$
declare
   v_chord_type_id BIGINT := (SELECT id FROM chord_type WHERE name = v_chord_type_name);
BEGIN
   
   IF (v_chord_type_id IS NOT NULL) THEN 
   	raise notice 'Chord type with name % already exists. Skipping.', v_chord_type_name;
	RETURN;
   END IF;

	INSERT INTO chord_type(name) 
 	SELECT v_chord_type_name
	RETURNING id INTO v_chord_type_id;
	
	INSERT INTO chord_type_note(chord_type_id, note)
	SELECT v_chord_type_id, notes.*
	FROM unnest(v_chord_type_notes) as notes;
	
	RETURN;
	
END
$$;

-- insert chords 

DO $$ 
BEGIN
  PERFORM fn_insert_chord_type_if_not_exists('', '{0, 4, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('m', '{0, 3, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('m6', '{0, 3, 7, 9}');
  PERFORM fn_insert_chord_type_if_not_exists('m7', '{0, 3, 7, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('m9', '{0, 3, 7, 10, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('maj7', '{0, 4, 7, 11}');
  PERFORM fn_insert_chord_type_if_not_exists('maj9', '{0, 4, 7, 11, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('maj13', '{0, 4, 7, 11, 14, 21}');
  PERFORM fn_insert_chord_type_if_not_exists('6', '{0, 4, 7, 9}');
  PERFORM fn_insert_chord_type_if_not_exists('5', '{0, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('7', '{0, 4, 7, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('9', '{0, 4, 7, 10, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('11', '{0, 4, 7, 10, 14, 17}');
  PERFORM fn_insert_chord_type_if_not_exists('13', '{0, 4, 7, 10, 14, 17, 21}');
  PERFORM fn_insert_chord_type_if_not_exists('6/9', '{0, 4, 7, 9, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('dim', '{0, 3, 6}');
  PERFORM fn_insert_chord_type_if_not_exists('dim7', '{0, 3, 6, 9}');
  PERFORM fn_insert_chord_type_if_not_exists('sus2', '{0, 2, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('sus4', '{0, 5, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('aug', '{0, 4, 8}');
  PERFORM fn_insert_chord_type_if_not_exists('add9', '{0, 4, 7, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('add2', '{0, 2, 4, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('mM7', '{0, 3, 7, 11}');
  PERFORM fn_insert_chord_type_if_not_exists('m11', '{0, 3, 7, 10, 14, 17}');
  PERFORM fn_insert_chord_type_if_not_exists('m13', '{0, 3, 7, 10, 14, 17, 21}');
  PERFORM fn_insert_chord_type_if_not_exists('7sus4', '{0, 5, 7, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7b9', '{0, 4, 7, 10, 13}');
  PERFORM fn_insert_chord_type_if_not_exists('7#5', '{0, 4, 8, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7b5', '{0, 4, 6, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7#11', '{0, 4, 7, 10, 18}');
  PERFORM fn_insert_chord_type_if_not_exists('m7b9', '{0, 3, 7, 10, 13}');
  PERFORM fn_insert_chord_type_if_not_exists('m7#5', '{0, 3, 8, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('m7b5', '{0, 3, 6, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('m7#11', '{0, 3, 7, 10, 18}');
  PERFORM fn_insert_chord_type_if_not_exists('9sus4', '{0, 5, 7, 10, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('+', '{0, 4, 8}');
END
$$;