{{- define "call-coach.name" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- define "call-coach.selectorLabels" -}}
app.kubernetes.io/name: call-coach
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
{{- define "call-coach.labels" -}}
{{ include "call-coach.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end -}}
