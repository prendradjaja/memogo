This is a React app that displays a game of go (given by the user as an SGF file) n moves at a time (n = moveStep).

The entry point is src/App.tsx.

The display is similar to a printed kifu (game record) that is split over multiple pages: On e.g. page 4, all moves from pages 1 to 3 are shown as stones on the board; the moves that are new in page 4 are shown as stones too but with move numbers.

- If you are making a commit for me, don't include your default attribution (e.g. Co-Authored-By and email). Instead, write: (no indentation)
    Co-authored by an LLM coding tool
- Don't run `tsc` for me. I'll do it if I need to.
