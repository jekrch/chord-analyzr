#!/usr/bin/env python3
"""
Static Data Generator for ChordAnalyzr
Generates JSON files from database queries for offline frontend usage
"""

import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import time
import sys
from typing import Dict, List, Any
import re

def snake_to_camel(snake_str: str) -> str:
    """Convert snake_case to camelCase"""
    components = snake_str.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])

def convert_keys_to_camel_case(obj: Any) -> Any:
    """Recursively convert dictionary keys from snake_case to camelCase"""
    if isinstance(obj, dict):
        return {snake_to_camel(k): convert_keys_to_camel_case(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_keys_to_camel_case(item) for item in obj]
    else:
        return obj

def wait_for_database(connection_params: Dict[str, str], max_retries: int = 60) -> None:
    """Wait for database to be ready"""
    print("Waiting for database to be ready...")
    
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**connection_params)
            conn.close()
            print("Database is ready!")
            return
        except psycopg2.OperationalError:
            if attempt < max_retries - 1:
                print(f"Database not ready, retrying in 1 second... (attempt {attempt + 1}/{max_retries})")
                time.sleep(1)
            else:
                print("Database failed to become ready within timeout period")
                sys.exit(1)

def get_database_connection() -> psycopg2.extensions.connection:
    """Create database connection"""
    connection_params = {
        'host': os.getenv('DB_HOST', 'postgres'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'chordanalyzr'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'pass')
    }
    
    wait_for_database(connection_params)
    
    return psycopg2.connect(**connection_params)

def fetch_modes(cursor) -> List[Dict[str, Any]]:
    """Fetch all modes"""
    print("Fetching modes...")
    
    query = "SELECT id, name FROM mode ORDER BY id;"
    cursor.execute(query)
    modes = cursor.fetchall()
    
    print(f"Found {len(modes)} modes")
    # Convert to camelCase
    return [convert_keys_to_camel_case(dict(mode)) for mode in modes]

def fetch_chords_by_mode(cursor) -> Dict[str, List[Dict[str, Any]]]:
    """Fetch chords grouped by mode"""
    print("Fetching chords by mode...")
    
    query = """
    SELECT mode_id, key_note, key_name, chord_note, chord_note_name, 
           chord_name, chord_notes, chord_note_names
    FROM mode_scale_chord_relation_view m
    WHERE m.mode_chord_note_diff_count = 0
    AND m.key_name not ilike '%##%' 
    AND m.key_name not ilike '%bb%' 
    AND m.key_name NOT IN ('B#','Cb', 'E#', 'Fb')
    ORDER BY mode_id, key_note, chord_note;
    """
    
    cursor.execute(query)
    chords = cursor.fetchall()
    
    # Group chords by mode_id and convert to camelCase
    chords_by_mode = {}
    for chord in chords:
        chord_dict = convert_keys_to_camel_case(dict(chord))
        mode_id = str(chord_dict['modeId'])
        
        if mode_id not in chords_by_mode:
            chords_by_mode[mode_id] = []
        
        chords_by_mode[mode_id].append(chord_dict)
    
    print(f"Found chords for {len(chords_by_mode)} modes")
    return chords_by_mode

def fetch_scale_notes_by_mode(cursor) -> Dict[str, List[Dict[str, Any]]]:
    """Fetch scale notes grouped by mode and key"""
    print("Fetching scale notes by mode...")
    
    query = """
    SELECT mode_id, key_name, seq_note, note_name
    FROM mode_scale_note_letter_mv
    WHERE key_name not ilike '%##%' 
    AND key_name not ilike '%bb%' 
    AND key_name NOT IN ('B#','Cb', 'E#', 'Fb')
    ORDER BY mode_id, key_name, note_ordinal;
    """
    
    cursor.execute(query)
    scale_notes = cursor.fetchall()
    
    # Group by mode_id and key_name, convert to camelCase
    scales_by_mode = {}
    for note in scale_notes:
        note_dict = dict(note)
        mode_id = str(note_dict['mode_id'])
        key_name = note_dict['key_name']
        
        if mode_id not in scales_by_mode:
            scales_by_mode[mode_id] = {}
        
        if key_name not in scales_by_mode[mode_id]:
            scales_by_mode[mode_id][key_name] = []
        
        # Convert to camelCase and match API structure
        scale_note_camel = {
            'seqNote': note_dict['seq_note'],
            'noteName': note_dict['note_name']
        }
        
        scales_by_mode[mode_id][key_name].append(scale_note_camel)
    
    print(f"Found scale notes for {len(scales_by_mode)} modes")
    return scales_by_mode

def ensure_output_directory(output_dir: str) -> None:
    """Ensure output directory exists"""
    os.makedirs(output_dir, exist_ok=True)
    print(f"Output directory: {output_dir}")

def save_json_file(data: Any, filepath: str) -> None:
    """Save data to JSON file"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    print(f"Saved: {filepath}")

def main():
    """Main function to generate static data files"""
    print("Starting static data generation...")
    
    output_dir = os.getenv('OUTPUT_DIR', '/output')
    ensure_output_directory(output_dir)
    
    try:
        # Connect to database
        conn = get_database_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Fetch modes
        modes = fetch_modes(cursor)
        save_json_file(modes, os.path.join(output_dir, 'modes.json'))
        
        # Fetch and save chords by mode
        chords_by_mode = fetch_chords_by_mode(cursor)
        for mode_id, chords in chords_by_mode.items():
            filename = f'chords-mode-{mode_id}.json'
            save_json_file(chords, os.path.join(output_dir, filename))
        
        # Fetch and save scale notes by mode
        scales_by_mode = fetch_scale_notes_by_mode(cursor)
        for mode_id, scales in scales_by_mode.items():
            filename = f'scales-mode-{mode_id}.json'
            save_json_file(scales, os.path.join(output_dir, filename))
        
        # Create index file with metadata
        index_data = {
            'generatedAt': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
            'modes': modes,
            'availableFiles': {
                'modes': 'modes.json',
                'chordsByMode': [f'chords-mode-{mode_id}.json' for mode_id in chords_by_mode.keys()],
                'scalesByMode': [f'scales-mode-{mode_id}.json' for mode_id in scales_by_mode.keys()]
            }
        }
        save_json_file(index_data, os.path.join(output_dir, 'index.json'))
        
        cursor.close()
        conn.close()
        
        print("Static data generation completed successfully!")
        
    except Exception as e:
        print(f"Error generating static data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()