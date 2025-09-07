import { useEffect, useState } from "react";
import { ModeControllerService, ModeDto } from "../api";
import { dataService } from "../services/DataService";

export function useModes() {
    const [modes, setModes] = useState<string[] | undefined>();
    const [error, setError] = useState(null);
  
    useEffect(() => {
      const fetchModes = async () => {
        try {
          const response = await dataService.getModes();
          //console.log('Fetched modes:', response);
          //setModes(response.sort((a: ModeDto, b: ModeDto) => a.id! - b.id!).map(m => m.name!));
          setModes(response.map(m => m.name!));
        } catch (err) {
          setError(err as any);
          console.error('Error fetching modes:', err);
        }
      };
  
      fetchModes();
    }, []);
  
    return { modes, error };
  }