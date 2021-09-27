# chord-analyzr

A Postgres driven solution for analyzing chord progressions and generating chord suggestions. 


<hr>
<h3>setup</h3> 
Create postgres database named chordanalyzr and insert user and password details in flyway.conf. 
<br>
<br>
To update schema, execute the following from the flyway directory:
<br>
<br>

```
flyway -configFiles="flyway.conf" migrate -X
```

<hr>
<h3>chord views</h3> 

```chord_view``` displays all permutations of root note and chord type, with the notes comprising each chord aggregated in csv. 

Sample usage: 

```
SELECT cv.chord_name, 
       cv.chord_note_names,
       cv.chord_notes
FROM chord_view cv
WHERE note_name = 'F' AND 
      chord_type = '7sus4';
```
Returns:
```
"F7sus4",   "F, A#, C, D#",   "6, 11, 13, 16"
```

<br>

To capture each note by row use ```chord_note_view```

<hr>
<h3>mode views</h3> 

```mode_view``` displays all permutations of key and mode, with the notes comprising each scale aggregated in csv. 

Sample usage: 

```
SELECT mv.mode, 
       mv.key_note, 
       mv.key_name, 
       mv.mode_note_names, 
       mv.mode_notes
FROM mode_view mv 
WHERE key_name = 'C';
```
Returns:
```
"Aeolian"	 1	"C"	"C, D, D#, F, G, G#, A#"      "1, 3, 4, 6, 8, 9, 11"
"Dorian"	 1	"C"	"C, D, D#, F, G, A, A#"       "1, 3, 4, 6, 8, 10, 11"
"Ionian"	 1	"C"	"C, D, E, F, G, A, B"         "1, 3, 5, 6, 8, 10, 12"
"Locrian"	 1	"C"	"C, C#, D#, F, F#, G#, A#"    "1, 2, 4, 6, 7, 9, 11"
"Lydian"	 1	"C"	"C, D, E, F#, G, A, B"        "1, 3, 5, 7, 8, 10, 12"
"Mixolydian"     1	"C"	"C, D, E, F, G, A, A#"        "1, 3, 5, 6, 8, 10, 11"
"Phrygian"	 1	"C"	"C, C#, D#, F, G, G#, A#"     "1, 2, 4, 6, 8, 9, 11"
```

<br>

To capture each note by row use ```mode_note_view```
