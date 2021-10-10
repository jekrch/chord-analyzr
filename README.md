# chord-analyzr

A Postgres driven solution for analyzing chord progressions and generating chord suggestions. 


<hr>
<h3>setup</h3> 
Create postgres database named chordanalyzr and insert user and password details in flyway.conf. 
<br>
<br>
To update schema, execute the following from the flyway directory using Flyway's <a href="https://flywaydb.org/documentation/usage/commandline/">command-line tool</a>:
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
       mv.key_name, 
       mv.mode_note_names, 
       mv.mode_notes, 
       mv.mode_seq_notes
FROM mode_view mv 
WHERE key_name = 'A';
```
Returns:
```
"mode"        "key_name"    "mode_note_names"            "mode_notes"                "mode_seq_notes"
"Aeolian"     "A"	    "A, B, C, D, E, F, G"        "10, 12, 1, 3, 5, 6, 8"     "10, 12, 13, 15, 17, 18, 20"
"Dorian"      "A"	    "A, B, C, D, E, F#, G"       "10, 12, 1, 3, 5, 7, 8"     "10, 12, 13, 15, 17, 19, 20"
"Ionian"      "A"	    "A, B, C#, D, E, F#, G#"     "10, 12, 2, 3, 5, 7, 9"     "10, 12, 14, 15, 17, 19, 21"
"Locrian"     "A"	    "A, Bb, C, D, Eb, F, G"      "10, 11, 1, 3, 4, 6, 8"     "10, 11, 13, 15, 16, 18, 20"
"Lydian"      "A"	    "A, B, C#, D#, E, F#, G#"    "10, 12, 2, 4, 5, 7, 9"     "10, 12, 14, 16, 17, 19, 21"
"Mixolydian"  "A"	    "A, B, C#, D, E, F#, G"      "10, 12, 2, 3, 5, 7, 8"     "10, 12, 14, 15, 17, 19, 20"
"Phrygian"    "A"	    "A, Bb, C, D, E, F, G"       "10, 11, 1, 3, 5, 6, 8"     "10, 11, 13, 15, 17, 18, 20"
```

<br>

To capture each note by row use ```mode_note_view```

<hr>
<h3>mode chord views</h3> 

```mode_scale_chord_relation_view``` displays all permutations of chord mode and key with any distinct notes listed and counted. This can be used for identifying chords that complement a given scale. 

Sample usage: 

The following query will return all chords that have a root note of A and whose comprising notes all fall within the C Ionian scale. 

```
SELECT mscv.mode, 
       mscv.key_name, 
       mscv.chord_name, 
       mscv.chord_notes,  
       mscv.mode_chord_note_diff, 
       mscv.mode_chord_note_diff_count 
FROM mode_scale_chord_relation_view mscv
WHERE mscv.mode = 'Ionian' AND 
      mscv.key_name = 'C' AND 
      mscv.chord_note_name = 'A' AND
      mscv.mode_chord_note_diff_count = 0
```
Returns:
```
"mode"      "key_name"  "chord_name"    "chord_notes"   "mode_chord_note_diff"  "mode_chord_note_diff_count"
"Ionian"    "C"         "Am"            "{1,5,10}"      "{}"                     "0"
"Ionian"    "C"         "Am7"           "{1,5,8,10}"    "{}"                     "0"
"Ionian"    "C"         "Am9"           "{1,5,8,10}"    "{}"                     "0"
"Ionian"    "C"         "A5"            "{5,10}"        "{}"                     "0"
"Ionian"    "C"         "Asus2"         "{5,10,12}"     "{}"                     "0"
"Ionian"    "C"         "Asus4"         "{3,5,10}"      "{}"                     "0"
"Ionian"    "C"         "Am11"          "{1,3,5,8,10}"  "{}"                     "0"
"Ionian"    "C"         "A7sus4"        "{3,5,8,10}"    "{}"                     "0"
"Ionian"    "C"         "Am7#5"         "{1,6,8,10}"    "{}"                     "0"
"Ionian"    "C"         "A9sus4"        "{3,5,8,10}"    "{}"                     "0"
```

<br>
