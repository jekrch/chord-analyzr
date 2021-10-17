CREATE TABLE IF NOT EXISTS public.mode
(
    id bigserial,
    name varchar NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS mode_name_idx ON note(name);


CREATE TABLE IF NOT EXISTS public.mode_note
(
    id bigserial,
    mode_id bigint NOT NULL,
		CONSTRAINT fk_mode_note_mode_id
			FOREIGN KEY(mode_id)
			REFERENCES mode,
	note integer NOT NULL,
	note_ordinal integer NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS mode_note_mode_id_idx ON mode_note(mode_id);
CREATE INDEX IF NOT EXISTS mode_note_note_idx ON mode_note(note);
CREATE INDEX IF NOT EXISTS mode_note_note_ordinal_idx ON mode_note(note_ordinal);
CREATE UNIQUE INDEX IF NOT EXISTS mode_note_mode_note_uidx ON mode_note(mode_id, note);


-- If the provided mode doesn't exist, create it and 
-- insert provided notes in mode_note
CREATE OR REPLACE FUNCTION fn_insert_mode_if_not_exists(
	v_mode_name varchar, 
	v_mode_notes integer[])
returns VOID
language plpgsql
as
$$
declare
   v_mode_id BIGINT := (SELECT id FROM mode WHERE name = v_mode_name);
BEGIN
   
   IF (v_mode_id IS NOT NULL) THEN 
   	raise notice 'Mode with name % already exists. Skipping.', v_mode_name;
	RETURN;
   END IF;

	INSERT INTO mode(name) 
 	SELECT v_mode_name
	RETURNING id INTO v_mode_id;
	
	INSERT INTO mode_note(mode_id, note, note_ordinal)
	SELECT v_mode_id, notes.*, row_number() over (ORDER BY notes.*)
	FROM unnest(v_mode_notes) as notes;
	
	RETURN;
	
END
$$;


-- insert modes 

DO $$ 
BEGIN
  PERFORM fn_insert_mode_if_not_exists('Ionian', '{0,2,4,5,7,9,11}');
  PERFORM fn_insert_mode_if_not_exists('Dorian', '{0,2,3,5,7,9,10}');
  PERFORM fn_insert_mode_if_not_exists('Phrygian', '{0,1,3,5,7,8,10}');
  PERFORM fn_insert_mode_if_not_exists('Lydian', '{0,2,4,6,7,9,11}');
  PERFORM fn_insert_mode_if_not_exists('Mixolydian', '{0,2,4,5,7,9,10}');
  PERFORM fn_insert_mode_if_not_exists('Aeolian', '{0,2,3,5,7,8,10}');
  PERFORM fn_insert_mode_if_not_exists('Locrian', '{0,1,3,5,6,8,10}');

  -- melodic minor modes
  PERFORM fn_insert_mode_if_not_exists('Melodic Minor', '{0,2,3,5,7,9,11}');
  PERFORM fn_insert_mode_if_not_exists('Dorian b2', '{0,1,3,5,7,9,10}');
  PERFORM fn_insert_mode_if_not_exists('Lydian Augmented', '{0,2,4,6,8,9,11}');
  PERFORM fn_insert_mode_if_not_exists('Lydian Dominant', '{0,2,4,6,7,9,10}');
  PERFORM fn_insert_mode_if_not_exists('Mixolydian b6', '{0,2,4,5,7,8,10}');
  PERFORM fn_insert_mode_if_not_exists('Locrian #2', '{0,2,3,5,6,8,10}');
  PERFORM fn_insert_mode_if_not_exists('Altered Scale', '{0,1,3,4,6,8,10}');
END
$$;
