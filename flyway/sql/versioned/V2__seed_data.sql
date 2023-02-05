
INSERT INTO public.note_type(id, name)
  VALUES
	(1, 'natural'), 
	(2, 'flat'), 
	(3, 'sharp'),
	(4, 'double sharp'),
	(5, 'double flat');


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
	('B', 'B#', 1, 3),
	
	-- double sharps
	('C', 'C##', 3, 4),
	('D', 'D##', 5, 4),
	('E', 'E##', 7, 4),
	('F', 'F##', 8, 4),
	('G', 'G##', 10, 4),
	('A', 'A##', 12, 4),
	('B', 'B##', 2, 4),
	
	-- double flats
	('C', 'Cbb', 11, 5),
	('D', 'Dbb', 1, 5),
	('E', 'Ebb', 3, 5),
	('F', 'Fbb', 4, 5),
	('G', 'Gbb', 6, 5),
	('A', 'Abb', 8, 5),
	('B', 'Bbb', 10, 5);
	
	
INSERT INTO letter(letter, letter_ordinal)
  VALUES
	('A', 1), 
	('B', 2),
	('C', 3),
	('D', 4),
	('E', 5),
	('F', 6),
	('G', 7);	

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

  PERFORM fn_insert_chord_type_if_not_exists('6', '{0, 4, 7, 9}');
  PERFORM fn_insert_chord_type_if_not_exists('5', '{0, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('b5', '{0, 4, 6}');

  PERFORM fn_insert_chord_type_if_not_exists('7', '{0, 4, 7, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7sus4', '{0, 5, 7, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7b9', '{0, 4, 7, 10, 13}');
  PERFORM fn_insert_chord_type_if_not_exists('7#5', '{0, 4, 8, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7b5', '{0, 4, 6, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7b5#9', '{0, 4, 6, 10, 15}');
  PERFORM fn_insert_chord_type_if_not_exists('7b5b9', '{0, 4, 6, 10, 13}');
  PERFORM fn_insert_chord_type_if_not_exists('7#5#9', '{0, 4, 8, 10, 15}');
  PERFORM fn_insert_chord_type_if_not_exists('7#5b9', '{0, 4, 8, 10, 13}');
  PERFORM fn_insert_chord_type_if_not_exists('7#5b9', '{0, 4, 7, 10, 15}');
	PERFORM fn_insert_chord_type_if_not_exists('7/6', '{0, 4, 7, 21, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('7 add(4)', '{0, 4, 5, 7, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('7b9', '{0, 4, 7, 10, 13}');
  PERFORM fn_insert_chord_type_if_not_exists('7#9', '{0, 4, 7, 10, 15}');
  PERFORM fn_insert_chord_type_if_not_exists('7#11', '{0, 4, 7, 10, 18}');
  PERFORM fn_insert_chord_type_if_not_exists('7aug5', '{0, 4, 8, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('7sus2', '{0, 2, 7, 10}');

  PERFORM fn_insert_chord_type_if_not_exists('9', '{0, 4, 7, 10, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('9sus4', '{0, 5, 7, 10, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('9#5', '{0, 4, 8, 14, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('9b5', '{0, 4, 6, 10, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('11', '{0, 4, 7, 10, 14, 17}');
  PERFORM fn_insert_chord_type_if_not_exists('11b9', '{0, 4, 7, 13, 14, 17, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('13', '{0, 4, 7, 10, 14, 17, 21}');
  PERFORM fn_insert_chord_type_if_not_exists('13#11', '{0, 4, 7, 14, 18, 21, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('13#b9', '{0, 4, 7, 13, 21, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('13#sus4', '{0, 2, 5, 7, 21, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('6/9', '{0, 4, 7, 9, 14}');

  PERFORM fn_insert_chord_type_if_not_exists('maj6/7', '{0, 4, 7, 21, 23}');
  PERFORM fn_insert_chord_type_if_not_exists('maj7', '{0, 4, 7, 11}');
  PERFORM fn_insert_chord_type_if_not_exists('maj7#11', '{0, 4, 7, 11, 18}');
  PERFORM fn_insert_chord_type_if_not_exists('maj7#5', '{0, 4, 8, 11}');
  PERFORM fn_insert_chord_type_if_not_exists('maj7b5', '{0, 4, 6, 11}');
  PERFORM fn_insert_chord_type_if_not_exists('maj7b5', '{0, 4, 6, 11}');
  PERFORM fn_insert_chord_type_if_not_exists('maj7#11', '{0, 4, 7, 11, 18}');
  PERFORM fn_insert_chord_type_if_not_exists('maj9', '{0, 4, 7, 11, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('maj9#11', '{0, 4, 7, 14, 18, 23}');
  PERFORM fn_insert_chord_type_if_not_exists('maj11', '{0, 4, 7, 11, 14, 17}');
  PERFORM fn_insert_chord_type_if_not_exists('maj13', '{0, 4, 7, 11, 14, 17, 21}');
  PERFORM fn_insert_chord_type_if_not_exists('maj13#11', '{0, 4, 7, 14, 18, 21, 23}');
  
  PERFORM fn_insert_chord_type_if_not_exists('add(2)', '{0, 2, 4, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('add(2) add(4)', '{0, 2, 4, 5, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('add(4)', '{0, 4, 5, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('add(9)', '{0, 4, 7, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('sus2', '{0, 2, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('sus4', '{0, 5, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('sus2sus4', '{0, 2, 5, 7}');  

  PERFORM fn_insert_chord_type_if_not_exists('m', '{0, 3, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('m6', '{0, 3, 7, 9}');
  PERFORM fn_insert_chord_type_if_not_exists('m6/9', '{0, 3, 7, 9, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('m7', '{0, 3, 7, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('m7#5', '{0, 3, 8, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('m7b5', '{0, 3, 6, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('m7b9', '{0, 3, 7, 10, 13}');
  PERFORM fn_insert_chord_type_if_not_exists('m7#11', '{0, 3, 7, 10, 18}');
  PERFORM fn_insert_chord_type_if_not_exists('m7/6', '{0, 3, 7, 21, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('m7 add(4)', '{0, 3, 5, 7, 22}');
  PERFORM fn_insert_chord_type_if_not_exists('m9', '{0, 3, 7, 10, 14}'); 
  PERFORM fn_insert_chord_type_if_not_exists('m11', '{0, 3, 7, 10, 14, 17}');
  PERFORM fn_insert_chord_type_if_not_exists('m13', '{0, 3, 7, 10, 14, 17, 21}');
  PERFORM fn_insert_chord_type_if_not_exists('m/Maj7', '{0, 3, 7, 11}');
  PERFORM fn_insert_chord_type_if_not_exists('m/Maj9', '{0, 3, 7, 11, 14}');
  PERFORM fn_insert_chord_type_if_not_exists('m/Maj11', '{0, 3, 7, 11, 14, 17}');
  PERFORM fn_insert_chord_type_if_not_exists('m/Maj13', '{0, 3, 7, 11, 14, 17, 21}');
  PERFORM fn_insert_chord_type_if_not_exists('m add(2)', '{0, 2, 3, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('m add(2) add(4)', '{0, 2, 3, 5, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('m add(4)', '{0, 3, 5, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('m add(4)', '{0, 3, 5, 7}');
  PERFORM fn_insert_chord_type_if_not_exists('m add(9)', '{0, 2, 3, 7}');

  PERFORM fn_insert_chord_type_if_not_exists('aug', '{0, 4, 8}');
  PERFORM fn_insert_chord_type_if_not_exists('aug7', '{0, 4, 8, 10}');
  PERFORM fn_insert_chord_type_if_not_exists('dim', '{0, 3, 6}');
  PERFORM fn_insert_chord_type_if_not_exists('dim7', '{0, 3, 6, 9}');
END
$$;