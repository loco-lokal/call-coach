package contract

import _ "embed"

//go:embed script-schema.json
var Schema []byte

//go:embed openapi.json
var OpenAPI []byte
