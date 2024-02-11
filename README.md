# chord-analyzr

A Postgres driven solution for analyzing chord progressions and generating chord suggestions. 

<img width="420" alt="image" src="https://github.com/jekrch/chord-analyzr/assets/8173930/325d6463-d340-4c2a-bd86-e2a1022c1d0e">

<hr>
<h3>Setup</h3> 

Execute ```docker-compose up``` to create a postgres database named chordanalyzr on ```localhost:5432``` with user credentials from ```flyway/flyway.conf```. 

Services for a spring boot API and react frontend will also be started, with the frontend available at `localhost:3000`

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
"F7sus4",   "F, Bb, C, D#",   "6, 11, 13, 16"
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
       mv.mode_notes
FROM mode_view mv 
WHERE key_name = 'A';
```
Returns:
```
"mode",              "key_name",   "mode_note_names",          "mode_notes"
Aeolian,             A,            "A, B, C, D, E, F, G",      "10, 12, 13, 15, 17, 18, 20"
Altered Scale,       A,            "A, Bb, C, Db, Eb, F, G",   "10, 11, 13, 14, 16, 18, 20"
Dorian,              A,            "A, B, C, D, E, F#, G",     "10, 12, 13, 15, 17, 19, 20"
Dorian b2,           A,            "A, Bb, C, D, E, F#, G",    "10, 11, 13, 15, 17, 19, 20"
Ionian,              A,            "A, B, C#, D, E, F#, G#",   "10, 12, 14, 15, 17, 19, 21"
Locrian,             A,            "A, Bb, C, D, Eb, F, G",    "10, 11, 13, 15, 16, 18, 20"
Locrian #2,          A,            "A, B, C, D, Eb, F, G",     "10, 12, 13, 15, 16, 18, 20"
Lydian,              A,            "A, B, C#, D#, E, F#, G#",  "10, 12, 14, 16, 17, 19, 21"
Lydian Augmented,    A,            "A, B, C#, D#, E#, F#, G#", "10, 12, 14, 16, 18, 19, 21"
Lydian Dominant,     A,            "A, B, C#, D#, E, F#, G",   "10, 12, 14, 16, 17, 19, 20"
Melodic Minor,       A,            "A, B, C, D, E, F#, G#",    "10, 12, 13, 15, 17, 19, 21"
Mixolydian,          A,            "A, B, C#, D, E, F#, G",    "10, 12, 14, 15, 17, 19, 20"
Mixolydian b6,       A,            "A, B, C#, D, E, F, G",     "10, 12, 14, 15, 17, 18, 20"
Phrygian,            A,            "A, Bb, C, D, E, F, G",     "10, 11, 13, 15, 17, 18, 20"
```
<br>

To capture each note by row use ```mode_note_view```

<hr>
<h3>mode chord views</h3> 

```mode_scale_chord_relation_mv``` displays all permutations of chord mode and key with any distinct notes listed and counted. This can be used for identifying chords that complement a given scale. 

Sample usage: 

The following query will return all chords that have a root note of A and whose comprising notes all fall within the C Ionian scale. 

```
SELECT mscv.mode, 
       mscv.key_name, 
       mscv.chord_name, 
       mscv.chord_notes,  
       mscv.mode_chord_note_diff, 
       mscv.mode_chord_note_diff_count 
FROM mode_scale_chord_relation_mv mscv
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

## Frontend

Initial progress is being made to build a spring-boot API and react frontend. Currently users can enter a key and mode, and see all chords that fall within the scale. Clicking on the chord name displays it on a piano component 
<p align="center">
       <img width="371" alt="image" src="https://github.com/jekrch/chord-analyzr/assets/8173930/479bd3e3-ec42-48b7-96d6-f2975bdb1e60">
</p>

