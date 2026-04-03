-- Allow authenticated users to insert/update/delete manual and imported rates (single-user / trusted client).

CREATE POLICY "exchange_rates_insert_authenticated"
  ON public.exchange_rates FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "exchange_rates_update_authenticated"
  ON public.exchange_rates FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "exchange_rates_delete_authenticated"
  ON public.exchange_rates FOR DELETE TO authenticated
  USING (true);
