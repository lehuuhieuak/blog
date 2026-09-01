package migrations

import "embed"

// Files is the versioned schema source used by the migration job.
//
//go:embed *.sql
var Files embed.FS
