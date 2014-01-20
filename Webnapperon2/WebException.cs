using System;

namespace Webnapperon2
{
	public sealed class WebException: Exception
	{
		public WebException(int httpStatus, int code, string detail)
		{
			HttpStatus = httpStatus;
			Code = code;
			Detail = detail;
		}

		public int HttpStatus { get; private set; }

		public int Code { get; private set; }

		public string Detail { get; private set; }
	}
}
