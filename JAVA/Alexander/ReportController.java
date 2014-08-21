package com.appfirst.reporting.controllers;

import com.appfirst.reporting.reports.Report;
import com.appfirst.reporting.reports.ReportType;
import com.appfirst.reporting.reports.Reports;
import com.appfirst.reporting.reports.SqlReport2Json;
import com.appfirst.reporting.reports.gen.Html2Pdf;
import com.appfirst.reporting.reports.gen.JS;
import com.appfirst.reporting.scheduler.AsyncReportWorker;
import org.apache.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.ServletRequestUtils;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.sql.Timestamp;
import java.util.Date;

@Controller
@RequestMapping("/report")
public class ReportController {
    // @Autowired private HttpServletRequest request;

    static final Logger    logger     = Logger.getLogger(ReportController.class);
    private File           currentDir = null;
    private final int      hashLength = 33;
    private SqlReport2Json reportData;
    AsyncReportWorker      worker;
    private JS             js;
    private Html2Pdf       html2pdf;

    @Autowired
    public void init() {

        this.worker = new AsyncReportWorker();

        String dir = System.getProperty("report.folder");

        if (dir != null) {
            this.currentDir = new File(dir);
            logger.debug("init controller with folder " + dir);
        } else {
            logger.fatal(dir + "directory with generated reports not found");
        }

        try {
            this.reportData = new SqlReport2Json();
            logger.debug(" --- " + this.reportData.isConnected() + " -- " + this.reportData.getPQuery());
        } catch (Exception e) {
            logger.fatal("error creating SqlReport2Json " + e.getMessage());
            e.printStackTrace();
        }

        try {
            this.setJs(new JS());
        } catch (IOException e) {
            logger.fatal("error reading JS file " + e.getMessage());
        }

        this.html2pdf = new Html2Pdf();

    }

    public Boolean findFile(String name, String fileNameToFind, String ext) {
        // logger.debug(" file " + name + " - ");
        if (name.length() > this.hashLength) {
            return name.indexOf(fileNameToFind) == 0 && fileNameToFind.equals(name.substring(0, this.hashLength)) && name.endsWith(ext);
        }
        return false;
    }

    File[] getFile(final String fileNameToFind, final String ext) {
        logger.debug(" start searching file " + fileNameToFind);
        File[] matchingFiles = this.currentDir.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {

                // 1e0ae2d27f218e0062b356fbe1720c151
                return findFile(name, fileNameToFind, ext);
            }
        });
        return matchingFiles;
    }

    private void setFileRespons(HttpServletResponse response, File reportFile) {
        try {

            byte[] reportBytes = null;
            if (reportFile != null && reportFile.exists()) {
                InputStream reportInputStream = new FileInputStream(reportFile);
                long length = reportFile.length();

                logger.debug("file found " + length);
                reportBytes = new byte[(int) length];
                int offset = 0;
                int numRead = 0;
                while (offset < reportBytes.length && (numRead = reportInputStream.read(reportBytes, offset, reportBytes.length - offset)) >= 0) {
                    offset += numRead;
                }
                if (offset < reportBytes.length) {
                    reportInputStream.close();
                    throw new Exception("Could not completely read file " + reportFile.getName());
                }
                reportInputStream.close();

                response.getOutputStream().write(reportBytes);

            }
        } catch (Exception e) {
            response.setStatus(500);
            e.printStackTrace();
        }
    }

    @RequestMapping(method = RequestMethod.GET, value = "/pdf/{id}")
    public @ResponseBody
    void responsePDF(@PathVariable("id") String id, HttpServletResponse response, HttpServletRequest request) throws Exception {

        logger.debug("get pdf report id " + id);
        File[] files = getFile(id, "pdf");

        if (files != null && files.length > 0) {
            logger.debug("files found " + files.length);
            response.reset();
            response.setContentType("application/pdf");
            setFileRespons(response, files[0]);

        } else {
            response.setStatus(404);
        }

    }

    @RequestMapping(method = RequestMethod.GET, value = "/html/{id}")
    public @ResponseBody
    void responseHTML(@PathVariable("id") String id, HttpServletResponse response, HttpServletRequest request) throws Exception {

        // String restOfTheUrl = (String)
        // request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);

        logger.debug("get html report id " + id);
        File[] files = getFile(id, "html");

        if (files != null && files.length > 0) {
            logger.debug("files found " + files.length);
            response.reset();
            response.setContentType("text/html");
            setFileRespons(response, files[0]);

        } else {
            response.setStatus(404);
        }

    }

    public Report getReportById(String id) throws Exception {

        long start = System.currentTimeMillis();
        logger.debug("getting report from DB id " + id);
        Reports reportsData = new Reports(this.reportData);
        Report report = reportsData.getReport(id);

        long end = System.currentTimeMillis();
        logger.debug("get report by id exec time: " + (end - start) + " ms");

        return report;
    }

    public String generateReport(Report report) throws Exception {

        String filename = null;

        if (report != null && this.reportData != null) {

            logger.debug("generate report id " + report.getTenantId() + " name " + report.getName());
            if (this.worker != null) {
                filename = this.worker.work(report, this.reportData);
                logger.debug("report saved to file " + filename);
            } else {
                logger.fatal("worker is not init");
            }
        }

        return filename;
    }

    public String generateJsonOfReport(Report report) throws Exception {

        String json = null;
        long start = System.currentTimeMillis();

        if (report != null && this.reportData != null) {

            logger.debug("generate report id " + report.getTenantId() + " name " + report.getName());
            if (this.worker != null) {
                json = this.worker.workJson(report, this.reportData);
            } else {
                logger.fatal("worker is not init");
            }
        }
        long end = System.currentTimeMillis();
        logger.debug("generateJsonOfReport exec time: " + (end - start) + " ms");

        return json;
    }

    // using html templates
    @RequestMapping(method = RequestMethod.GET, value = "/xhtml/{id}")
    public @ResponseBody
    void responseXHTML(@PathVariable("id") String id, HttpServletResponse response, HttpServletRequest request) throws Exception {

        long start = System.currentTimeMillis();

        Validator validator = new Validator();
        String validatorMessage = validator.checkTimeRange(ServletRequestUtils.getStringParameter(request, "time_start"),
                ServletRequestUtils.getStringParameter(request, "time_end"));

        if (validatorMessage.isEmpty() || validatorMessage == null) {

            Long timeStart = validator.getTimeStart();
            Long timeEnd = validator.getTimeEnd();
            logger.debug("request for report with id " + id + " and time_start = " + timeStart + ", time_end = " + timeEnd);

            if (id != null && id.length() > 0) {

                Report report = getReportById(id);

                if (timeStart != -1 && timeEnd != -1) {
                    report.setStartTimestamp(new Timestamp(timeStart));
                    report.setEndTimestamp(new Timestamp(timeEnd));
                }

                logger.debug("TIMESTAMPS = " + report.getStartTimestamp() + " " + report.getEndTimestamp());
                try {
                String json = generateJsonOfReport(report);
//                if (json != null) {

                    String jsonStr = report.getConfigInJson();
                    ReportType reportType = ReportType.getTypeByCode(report.getType());
                    String reportTplName = reportType.getSystemName();
                    String html = this.getJs().injectData2Html("var _afData= " + json + ";" + "var afReportingConfig = " + jsonStr + ";",
                            reportTplName);

                    response.setContentType("text/html");
                    response.getWriter().write(html);

                } catch (Exception e){
                    logger.debug("Cann't Get Report Data: " + e);
                    response.sendError(500, "Cann't Get Report Data: " + e);
                }
            } else {
                response.sendError(404, "Report with " + id + "not found in DB");
            }
        } else {
            response.sendError(404, validatorMessage);
        }

        long end = System.currentTimeMillis();
        logger.debug("responseXHTML exec time: " + (end - start) + " ms");
    }

    // String url =
    // "http://192.168.1.49:8080/af-reporting/report/xhtml/24?display=no-pagination";
    // String path = "/tmp/file.pdf";
    // just for tests
    @RequestMapping(method = RequestMethod.GET, value = "/xpdf/{id}")
    public @ResponseBody
    void responseXPDF(@PathVariable("id") String id, HttpServletResponse response, HttpServletRequest request) throws Exception {

        logger.debug("request for xpdf report with id " + id);
        long start = System.currentTimeMillis();
        if (id != null && id.length() > 0) {

            String baseUrl = String.format("%s://%s:%d%s/", request.getScheme(), request.getServerName(), request.getServerPort(),
                    request.getContextPath());

            String result = convertHtmlByurl2Pdf(id, baseUrl);
            if (result != null) {

                File file = new File(result);

                logger.debug("file was found " + file);
                response.reset();
                response.setContentType("application/pdf");
                response.setHeader("Content-Length", String.valueOf(file.length()));
                response.setHeader("Content-disposition", "attachment; filename=report" + id + ".pdf");
                setFileRespons(response, file);
            } else {
                response.setStatus(500);
            }

        } else {
            response.setStatus(402);
        }

        long end = System.currentTimeMillis();
        logger.debug("responseXPDF exec time: " + (end - start) + " ms");

    }

    public String convertHtmlByurl2Pdf(String id, String baseUrl) {

        String result = null;
        String url = baseUrl + "report/xhtml/" + id + "?display=no-pagination";
        String fileName = (new Date()).toString().replaceAll(" ", "");
        String path = this.currentDir.getAbsolutePath() + "/" + fileName + ".pdf";

        logger.debug("report url " + url + " file " + path);

        int code = html2pdf.pdf(url, path);

        if (code >= 0) {
            return path;
        }

        return result;

    }

    // getJSON
    @RequestMapping(method = RequestMethod.GET, value = "/json/{id}")
    public @ResponseBody
    void json(@PathVariable("id") String id, HttpServletResponse response, HttpServletRequest request) throws Exception {

        Validator validator = new Validator();
        String validatorMessage = validator.checkTimeRange(ServletRequestUtils.getStringParameter(request, "time_start"),
                ServletRequestUtils.getStringParameter(request, "time_end"));
        if (validatorMessage.isEmpty() || validatorMessage == null) {

            Long timeStart = validator.getTimeStart();
            Long timeEnd = validator.getTimeEnd();

            logger.debug("request for report with id " + id + " and time_start = " + timeStart + ", time_end = " + timeEnd);
            if (id != null && id.length() > 0) {

                Report report = getReportById(id);

                if (timeStart != -1 && timeEnd != -1) {
                    report.setStartTimestamp(new Timestamp(timeStart));
                    report.setEndTimestamp(new Timestamp(timeEnd));
                }

                logger.debug("TIMESTAMPS = " + report.getStartTimestamp() + " " + report.getEndTimestamp());
                try {
                    String json = generateJsonOfReport(report);
                    response.setContentType("application/json");
                    response.getWriter().write(json);
                } catch (Exception e){
                    logger.debug("Cann't Get Report Data: " + e);
                    response.sendError(500, "Cann't Get Report Data: " + e);
                }
            } else {
                response.sendError(404, "Report with " + id + "not found in DB");
            }
        } else {
            response.sendError(404, validatorMessage);
        }

    }

    @RequestMapping(method = RequestMethod.GET, value = "/generate/{id}")
    public @ResponseBody
    void generate(@PathVariable("id") String id, HttpServletResponse response, HttpServletRequest request) throws Exception {

        logger.debug("request for report with id " + id);
        if (id != null && id.length() > 0) {

            Report report = getReportById(id);
            String fileName = generateReport(report);
            if (fileName != null) {

                File file = new File(fileName);
                setFileRespons(response, file);

            } else {
                response.setStatus(404);
            }
        } else {
            response.setStatus(402);
        }

    }

    public JS getJs() {
        return js;
    }

    public void setJs(JS js) {
        this.js = js;
    }
}