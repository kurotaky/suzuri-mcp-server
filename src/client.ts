const BASE_URL = "https://suzuri.jp/api/v1";

export function getToken(): string {
  const token = process.env.SUZURI_TOKEN;
  if (!token) {
    throw new Error(
      "SUZURI_TOKEN 環境変数が設定されていません。https://suzuri.jp/developer/apps からトークンを取得してください。"
    );
  }
  return token;
}

export async function suzuriRequest(
  path: string,
  options: {
    method?: string;
    params?: Record<string, string | number | undefined>;
    body?: Record<string, unknown>;
  } = {}
): Promise<unknown> {
  const { method = "GET", params, body } = options;
  const url = new URL(`${BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`SUZURI API エラー (${res.status}): ${errorText}`);
  }

  if (res.status === 204) return { success: true };
  return res.json();
}
