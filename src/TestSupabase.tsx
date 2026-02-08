import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
}

export default function TestSupabase() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from("Events")  // usa exatamente o nome da tua tabela
        .select("*");

      if (error) {
        console.error("Erro Supabase:", error);
      } else {
        setEvents(data as Event[]);
      }
    }

    loadEvents();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Testando Supabase</h1>
      <pre>{JSON.stringify(events, null, 2)}</pre>
    </div>
  );
}

