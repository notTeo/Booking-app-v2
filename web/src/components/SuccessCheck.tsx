/** A tick drawn inside a filled circle: the "done" mark after something was completed. */
export default function SuccessCheck() {
  return (
    <svg className="success-check" viewBox="0 0 52 52" aria-hidden="true">
      <circle className="success-check__disc" cx="26" cy="26" r="26" />
      <path className="success-check__tick" pathLength={1} d="M15 27.5l7.5 7.5L37.5 19" />
    </svg>
  );
}
