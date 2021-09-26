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
<h3>chord_view</h3> 

This view displays all permutations of root note and chord type, displaying arrays of the notes comprising each chord. 

Sample usage: 

```
SELECT cv.chord_name, cv.chord_note_names, cv.chord_notes
FROM chord_view cv
WHERE note_name = 'F' AND 
      chord_type = '7sus4';
```
Returns:
```
"F7sus4", "F, A#, C, D#", "6, 11, 1, 4"
```
