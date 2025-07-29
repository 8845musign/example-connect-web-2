import { Form, useNavigation, useActionData } from "react-router";
import type { Route } from "./+types/index";

export async function clientAction({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  
  if (!username?.trim()) {
    return { error: "ユーザー名を入力してください" };
  }
  
  sessionStorage.setItem("username", username);
  
  throw new Response(null, {
    status: 302,
    headers: { Location: "/chat" },
  });
}

export default function LoginRoute() {
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  return (
    <div className="login-container">
      <div className="login-box">
        <h1>チャットルームへようこそ</h1>
        <Form method="post">
          <div className="form-group">
            <label htmlFor="username">ユーザー名</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="名前を入力してください"
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          {actionData?.error && (
            <div className="error-message">{actionData.error}</div>
          )}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "接続中..." : "入室"}
          </button>
        </Form>
      </div>
    </div>
  );
}