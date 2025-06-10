export function MainFooter() {
  return (
    <footer className="py-8 px-6 border-t bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} St. Joseph's Montessori. All rights reserved.</p>
        <p className="text-sm mt-1">Powered by St. Joseph's EdTech</p>
      </div>
    </footer>
  );
}
