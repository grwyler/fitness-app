export type ReleaseNotesSection = {
  title: string;
  items: string[];
};

export type ReleaseNotesEntry = {
  version: string;
  date?: string;
  sections: ReleaseNotesSection[];
};

export type ReleaseNotesData = {
  releases: ReleaseNotesEntry[];
};

