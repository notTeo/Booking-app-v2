-- The email a customer typed for this one booking on the public page. Its
-- confirmation, reminder and change emails go there, without ever changing the
-- customer's own record (anyone who knows a phone number could otherwise attach
-- their address to that customer).
ALTER TABLE "Booking" ADD COLUMN "contactEmail" TEXT;
