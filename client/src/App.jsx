import { useEffect, useState } from "react";
import api from "./api/api";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/");
        setMessage(response.data.message);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center">
      <h1 className="text-4xl font-bold">
        {message}
      </h1>
    </div>
  );
}

export default App;