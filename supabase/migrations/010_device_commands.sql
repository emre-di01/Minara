-- Remote-Befehle für Pi-Geräte
CREATE TABLE IF NOT EXISTS device_commands (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  hardware_id text        NOT NULL,
  command     text        NOT NULL,
  payload     jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  executed_at timestamptz,
  result      text,
  status      text        DEFAULT 'pending'
);

ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;

-- Pi (anon): eigene Befehle lesen und als erledigt markieren
CREATE POLICY "pi read commands"   ON device_commands FOR SELECT USING (true);
CREATE POLICY "pi update commands" ON device_commands FOR UPDATE USING (true);

-- Owner: Befehle für eigene Screens einfügen und lesen
CREATE POLICY "owner insert commands" ON device_commands
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM screens
      WHERE screens.hardware_id = device_commands.hardware_id
        AND screens.owner_id = auth.uid()
    )
  );
