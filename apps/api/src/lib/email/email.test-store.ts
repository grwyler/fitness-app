type PasswordResetEmailRecord = {
  to: string;
  resetLink: string;
  createdAt: Date;
};

const records: PasswordResetEmailRecord[] = [];

export function recordPasswordResetEmail(input: { to: string; resetLink: string }) {
  records.push({
    to: input.to,
    resetLink: input.resetLink,
    createdAt: new Date()
  });
}

export function resetEmailTestStore() {
  records.length = 0;
}

export function getLastPasswordResetEmail(to: string) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (record && record.to.toLowerCase() === to.toLowerCase()) {
      return record;
    }
  }

  return null;
}

export function getAllPasswordResetEmails() {
  return [...records];
}

