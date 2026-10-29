// Binary wire format shared with js/net.js (little-endian).
//
// Client -> server, player state (20 bytes):
//   u8 type=1 | u8 level | u8 anim | u8 flags | f32 x | f32 y | f32 z |
//   i16 heading*10000 | i16 speed*100
//
// Entity record (22 bytes):
//   u32 id | u8 anim | u8 flags | f32 x | f32 y | f32 z | i16 heading | i16 speed
//
// Cell payload published on the bus: u32 instanceId | u16 count | records
// Server -> client snapshot: u8 type=2 | u8 0 | u16 count | records
'use strict';

const MSG_STATE = 1;
const MSG_SNAPSHOT = 2;
const STATE_BYTES = 20;
const REC = 22;

function readState(buf) {
  if (buf.length !== STATE_BYTES || buf[0] !== MSG_STATE) return null;
  const x = buf.readFloatLE(4), y = buf.readFloatLE(8), z = buf.readFloatLE(12);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  if (Math.abs(x) > 1e6 || Math.abs(y) > 1e5 || Math.abs(z) > 1e6) return null;
  return { level: buf[1], anim: buf[2], flags: buf[3], x, y, z, h: buf.readInt16LE(16), sp: buf.readInt16LE(18) };
}

function writeRecord(buf, off, s) {
  buf.writeUInt32LE(s.id >>> 0, off);
  buf[off + 4] = s.anim;
  buf[off + 5] = s.flags;
  buf.writeFloatLE(s.x, off + 6);
  buf.writeFloatLE(s.y, off + 10);
  buf.writeFloatLE(s.z, off + 14);
  buf.writeInt16LE(s.h, off + 18);
  buf.writeInt16LE(s.sp, off + 20);
}

module.exports = { MSG_STATE, MSG_SNAPSHOT, STATE_BYTES, REC, readState, writeRecord };
