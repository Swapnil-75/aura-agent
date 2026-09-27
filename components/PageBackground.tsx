export default function PageBackground() {
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-0 h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="absolute -right-1/6 -top-1/6 h-[55%] w-[55%] min-h-[300px] min-w-[300px] rounded-full bg-[#E1F5EE] opacity-90 blur-[60px] dark:bg-[#123027]" />
      <div className="absolute -bottom-1/6 -left-1/6 h-[38%] w-[38%] min-h-[200px] min-w-[200px] rounded-full bg-[#E1F5EE] opacity-90 blur-[60px] dark:bg-[#123027]" />
    </div>
  );
}
