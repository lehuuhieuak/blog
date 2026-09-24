package deliveryhttp

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hieulh/blog/backend/internal/domain"
)

const adminSessionContextKey = "admin_session"

func (a *AdminAuth) login(c *gin.Context) {
	var credentials struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&credentials); err != nil {
		writeError(c, domain.NewValidationError(map[string]string{"body": "invalid JSON body"}))
		return
	}
	fields := make(map[string]string)
	if credentials.Username == "" {
		fields["username"] = "username is required"
	}
	if credentials.Password == "" {
		fields["password"] = "password is required"
	}
	if len(fields) > 0 {
		writeError(c, domain.NewValidationError(fields))
		return
	}
	if !a.validCredentials(credentials.Username, credentials.Password) {
		c.JSON(http.StatusUnauthorized, errorEnvelope("unauthorized", "Phiên đăng nhập không hợp lệ", nil))
		return
	}
	cookie, _, err := a.issueCookie()
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorEnvelope("internal_error", "Đã xảy ra lỗi máy chủ", nil))
		return
	}
	http.SetCookie(c.Writer, cookie)
	c.Status(http.StatusNoContent)
}

func (a *AdminAuth) logout(c *gin.Context) {
	http.SetCookie(c.Writer, a.clearCookie())
	c.Status(http.StatusNoContent)
}

func (a *AdminAuth) requireSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		session, err := a.sessionFromRequest(c.Request)
		if err != nil {
			c.JSON(http.StatusUnauthorized, errorEnvelope("unauthorized", "Phiên đăng nhập không hợp lệ", nil))
			c.Abort()
			return
		}
		c.Set(adminSessionContextKey, session)
		c.Next()
	}
}

func (a *AdminAuth) requireAdminOrigin() gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}
		origins := c.Request.Header.Values("Origin")
		if len(origins) != 1 || origins[0] != a.allowedOrigin {
			c.JSON(http.StatusForbidden, errorEnvelope("csrf_failed", "Nguồn yêu cầu không hợp lệ", nil))
			c.Abort()
			return
		}
		c.Next()
	}
}

func (a *AdminAuth) session(c *gin.Context) {
	value, exists := c.Get(adminSessionContextKey)
	session, ok := value.(AdminSession)
	if !exists || !ok || session.Username == "" {
		c.JSON(http.StatusUnauthorized, errorEnvelope("unauthorized", "Phiên đăng nhập không hợp lệ", nil))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": session})
}
