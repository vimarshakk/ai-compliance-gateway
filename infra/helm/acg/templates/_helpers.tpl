{{/*
Common labels for all ACG resources.
*/}}
{{- define "acg.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: acg
{{- end }}

{{/*
Selector labels for gateway.
*/}}
{{- define "acg.gateway.selectorLabels" -}}
app.kubernetes.io/name: acg-gateway
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for admin.
*/}}
{{- define "acg.admin.selectorLabels" -}}
app.kubernetes.io/name: acg-admin
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for dashboard.
*/}}
{{- define "acg.dashboard.selectorLabels" -}}
app.kubernetes.io/name: acg-dashboard
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
