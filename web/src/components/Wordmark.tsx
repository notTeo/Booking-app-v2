/**
 * The BeBooked logo text — "Be" in orange (DS `wordmark__be`), "Booked" in the surrounding colour.
 * `short` keeps only "Be" (the collapsed sidebar rail).
 */
export default function Wordmark({ short = false }: { short?: boolean }) {
  return (
    <>
      <span className="wordmark__be">Be</span>{!short && 'Booked'}
    </>
  );
}
