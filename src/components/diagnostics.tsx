export default function Diagnostics({
  status,
  lastEvent,
  track,
  events,
  errorText,
}: {
  status: string;
  lastEvent: string;
  track: string;
  events: string[];
  errorText: string;
}) {
  return (
    <>
      {errorText && <p className="text-red-600">error: {errorText}</p>}
      <details>
        <summary className="cursor-pointer text-xs">Diagnostics</summary>
        <p>status: {status}</p>
        <p>last event: {lastEvent}</p>
        <p>remote track: {track}</p>
        <p className="text-xs break-all">events: {events.join(" > ")}</p>
      </details>
    </>
  );
}
