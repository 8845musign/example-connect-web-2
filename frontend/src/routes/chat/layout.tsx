import { Outlet, useNavigate } from "react-router";
import type { Route } from "./+types/layout";

export async function clientLoader() {
  const username = sessionStorage.getItem("username");
  
  if (!username) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }
  
  return { username };
}

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    sessionStorage.removeItem("username");
    navigate("/");
  };
  
  return (
    <div className="chat-layout">
      <header className="chat-header">
        <h1>Connect RPC Chat</h1>
        <button onClick={handleLogout} className="logout-button">
          退室
        </button>
      </header>
      <Outlet context={{ username: loaderData.username }} />
    </div>
  );
}