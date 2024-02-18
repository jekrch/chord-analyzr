import { useEffect, useState } from "react";
import { ModeControllerService } from "../api";

export function useModes() {
    const [modes, setModes] = useState<string[] | undefined>();
    const [error, setError] = useState(null);
  
    useEffect(() => {
      const fetchModes = async () => {
        try {
          const response = await ModeControllerService.getModes();
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