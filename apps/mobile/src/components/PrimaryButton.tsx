import { Button } from "./Button";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger";
};

export function PrimaryButton(props: PrimaryButtonProps) {
  return <Button {...props} />;
}
