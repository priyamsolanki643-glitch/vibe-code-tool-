# Open FP Sovereign in Antigravity IDE

## Quick open

1. Launch **Antigravity IDE** (desktop shortcut or Start menu).
2. **File → Open Folder**
3. Select this folder:
   - `C:\Users\Hp\Projects\fp-sovereign` (recommended), or
   - `C:\Users\Hp\fp-sovereign` (original copy)

## First run in Antigravity

Open the integrated terminal (`Ctrl+``) and run:

```powershell
npm install
npm run dev
```

Then open **http://localhost:3000**

## Antigravity 2.0 (agent app)

If you use **Antigravity 2.0** (agent-first app, not the IDE):

1. Create or open a **Project** in 2.0.
2. **Add Folder** → choose `C:\Users\Hp\Projects\fp-sovereign`.
3. Do not open the same folder in **both** IDE and 2.0 at once on the same tree (avoids file conflicts).

## Cursor → Antigravity

| Cursor | Antigravity IDE |
|--------|-----------------|
| Open folder | File → Open Folder |
| Terminal | View → Terminal |
| Command palette | `Ctrl+Shift+P` |
| AI agent | Antigravity agent panel (built-in) |

Your code, git history, and `docs/ARCHITECTURE.md` move with the folder — no special export needed.
