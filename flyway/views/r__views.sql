

-- view fetches all permutations of chord types with root notes 
-- and neatly displays an array of the containing notes 
DROP VIEW IF EXISTS chord_view;

CREATE OR REPLACE VIEW chord_view AS 
SELECT 
    n.note AS note,
	n.name AS note_name, 
	ct.name AS chord_type,
	n.name || ct.name as chord_name,
	string_agg(chord_note.name, ', '  order by ctn.note) chord_note_names, 
	string_agg((ctn.note + n.note)::text, ', ' order by ctn.note) chord_notes
FROM chord_type_note ctn 
JOIN chord_type ct ON ct.id = ctn.chord_type_id
JOIN note n ON true
JOIN note chord_note ON chord_note.note = 
	(CASE WHEN (ctn.note + n.note) <= 12 THEN (ctn.note + n.note)
	ELSE (ctn.note + n.note) - 12 END)
	AND chord_note.note_type_id IN (1,3)
GROUP BY n.note, n.name, ct.name;