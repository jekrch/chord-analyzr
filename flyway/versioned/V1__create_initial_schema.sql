
CREATE TABLE IF NOT EXISTS public.note_type
(
    id bigserial,
    name varchar NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS note_type_name_idx ON note_type(name);

CREATE TABLE IF NOT EXISTS public.note
(
    id bigserial,
    name varchar NOT NULL,
	letter varchar NOT NULL,
    note integer NOT NULL,
	note_type_id bigint NOT NULL,
		CONSTRAINT fk_note_note_type
			FOREIGN KEY(note_type_id)
			REFERENCES note_type,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS note_note_idx ON note(note);
CREATE INDEX IF NOT EXISTS note_name_idx ON note(name);
CREATE INDEX IF NOT EXISTS note_note_type_id_idx ON note(note_type_id);

CREATE TABLE IF NOT EXISTS public.chord_type
(
    id bigserial,
    name varchar NOT NULL ,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS chord_type_name_idx ON chord_type(name);

CREATE TABLE IF NOT EXISTS public.chord_type_note
(
    id bigserial,
    chord_type_id bigint NOT NULL,
		CONSTRAINT fk_chord_type_note_type_id
			FOREIGN KEY(chord_type_id)
			REFERENCES chord_type,
	note integer NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS chord_type_note_note_idx ON chord_type_note(note);
CREATE INDEX IF NOT EXISTS chord_type_note_type_id_idx ON chord_type_note(chord_type_id);