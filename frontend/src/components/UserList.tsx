import type { User } from "../gen/proto/chat/v1/chat_pb";

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  return (
    <div className="user-list">
      <h3>オンラインユーザー ({users.length})</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id} className="user-item">
            <span className="user-status">●</span>
            <span className="user-name">{user.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}