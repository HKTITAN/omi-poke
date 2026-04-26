function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  get OMI_APP_ID() {
    return required("OMI_APP_ID");
  },
  get APP_SECRET() {
    return required("APP_SECRET");
  },
  get PUBLIC_BASE_URL() {
    return required("PUBLIC_BASE_URL").replace(/\/$/, "");
  },
  get OMI_WEBHOOK_SECRET() {
    return process.env.OMI_WEBHOOK_SECRET || "";
  },
};
