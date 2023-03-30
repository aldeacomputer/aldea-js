CREATE TABLE txos(
    location BLOB PRIMARY KEY,
    origin BLOB,
    class BLOB,
    lock BLOB,
    state BLOB,
    spend BLOB,
);
CREATE INDEX idx_txos_spend ON txos(spend);

CREATE TABLE keys(
    address TEXT PRIMARY KEY,
    pubkey BLOB,
    privkey BLOB,
);