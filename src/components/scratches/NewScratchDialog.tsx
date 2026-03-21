import { useState } from "react";
import { useScratchStore } from "../../stores/useScratchStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGES = [
  { value: "text", label: "Text" },
  { value: "typescript", label: "TypeScript" },
  { value: "rust", label: "Rust" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
];

export function NewScratchDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("text");
  const [error, setError] = useState("");
  const createScratch = useScratchStore((s) => s.createScratch);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    try {
      await createScratch(trimmed, language);
      setName("");
      setLanguage("text");
      setError("");
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Scratch</DialogTitle>
          <DialogDescription>
            Create a quick scratch file for notes or code.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="scratch-name">Name</Label>
            <Input
              id="scratch-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="my-scratch"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scratch-language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
