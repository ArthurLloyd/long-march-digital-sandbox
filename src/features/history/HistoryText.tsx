/** Plain text with explicit HTTP(S) references. Never interprets HTML or Markdown. */
export function HistoryText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s<>（）]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
