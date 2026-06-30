-- Permite que cada usuario actualice su propia respuesta de la encuesta
create policy "encuesta: actualizar propia" on encuesta_beraca
  for update using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
