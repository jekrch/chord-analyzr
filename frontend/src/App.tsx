import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { ChordControllerService } from './api/services/ChordControllerService';
import { ModeControllerService } from './api/services/ModeControllerService';
import { ModeDto } from './api/models/ModeDto';


function App() {

  const [refresh, setRefresh] = useState(0);
  const [chords, setChords] = useState(null);
  const [error, setError] = useState(null);
  const [modes, setModes] = useState<ModeDto[] | undefined>();

  useEffect(() => {
    ModeControllerService.getModes()
        .then((response) => {
            setModes(response); 
            setRefresh(Math.random());
            console.log(response);
        })
        .catch((err) => {
            setError(err);
            console.error('Error fetching modes:', err);
        });
}, []);

    useEffect(() => {
      ChordControllerService.getChords()
          .then((response) => {
              setChords(response.data); 
          })
          .catch((err) => {
              setError(err);
              console.error('Error fetching chords:', err);
          });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
       
        <p key={`modes=${refresh}`}>
          {modes?.map((mode: ModeDto, index: number) => (
            <div 
              key={`mode-${index}`}
              className="text-slate-200"
            >
                {mode.name}
              </div>
          ))}
        </p>
       
      </header>
    </div>
  );
}

export default App;
