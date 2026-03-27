export type AppTemplateId = 'javaee' | 'springboot' | 'struts2' | 'jakartaee';

export interface AppTemplate {
    id: AppTemplateId;
    labelKey: string;
    descriptionKey: string;
    pomFragment: string;
    mainClass?: string;
    artifacts: Array<{ path: string; content: string }>;
}

const templates: AppTemplate[] = [
    {
        id: 'javaee',
        labelKey: 'app.create.template.javaee',
        descriptionKey: 'app.create.template.javaee.desc',
        pomFragment: `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>{{appName}}</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>war</packaging>
    <name>{{appName}}</name>
    <dependencies>
      <dependency>
        <groupId>javax</groupId>
        <artifactId>javaee-api</artifactId>
        <version>8.0</version>
        <scope>provided</scope>
      </dependency>
    </dependencies>
</project>
`,
        artifacts: [
            {
                path: 'src/main/webapp/WEB-INF/web.xml',
                content: `<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee http://xmlns.jcp.org/xml/ns/javaee/web-app_3_1.xsd" version="3.1">
    <display-name>{{appName}}</display-name>
</web-app>`
            },
            {
                path: 'src/main/java/com/example/HelloServlet.java',
                content: `package com.example;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebServlet("/hello")
public class HelloServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("text/plain;charset=UTF-8");
        resp.getWriter().write("Hello from {{appName}}!");
    }
}`
            }
        ]
    },
    {
        id: 'springboot',
        labelKey: 'app.create.template.springboot',
        descriptionKey: 'app.create.template.springboot.desc',
        pomFragment: `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>{{appName}}</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.6.8</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <dependencies>
      <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
      </dependency>
    </dependencies>
    <build>
      <plugins>
        <plugin>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
      </plugins>
    </build>
</project>
`,
        artifacts: [
            {
                path: 'src/main/java/com/example/Application.java',
                content: `package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}`
            }
        ]
    },
    {
        id: 'struts2',
        labelKey: 'app.create.template.struts2',
        descriptionKey: 'app.create.template.struts2.desc',
        pomFragment: `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>{{appName}}</artifactId>
    <version>1.0.0</version>
    <packaging>war</packaging>
    <dependencies>
      <dependency>
        <groupId>org.apache.struts</groupId>
        <artifactId>struts2-core</artifactId>
        <version>2.5.26</version>
      </dependency>
    </dependencies>
</project>
`,
        artifacts: [
            {
                path: 'src/main/webapp/WEB-INF/web.xml',
                content: `<web-app xmlns="http://java.sun.com/xml/ns/javaee" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_2_5.xsd" version="2.5">
    <filter>
        <filter-name>struts2</filter-name>
        <filter-class>org.apache.struts2.dispatcher.filter.StrutsPrepareAndExecuteFilter</filter-class>
    </filter>
    <filter-mapping>
        <filter-name>struts2</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>
</web-app>`
            }
        ]
    },
    {
        id: 'jakartaee',
        labelKey: 'app.create.template.jakartaee',
        descriptionKey: 'app.create.template.jakartaee.desc',
        pomFragment: `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>{{appName}}</artifactId>
    <version>1.0.0</version>
    <packaging>war</packaging>
    <dependencies>
      <dependency>
        <groupId>jakarta.platform</groupId>
        <artifactId>jakarta.jakartaee-web-api</artifactId>
        <version>9.1.0</version>
        <scope>provided</scope>
      </dependency>
    </dependencies>
</project>
`,
        artifacts: [
            {
                path: 'src/main/webapp/WEB-INF/web.xml',
                content: `<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee https://jakarta.ee/xml/ns/jakartaee/web-app_5_0.xsd" version="5.0">
    <display-name>{{appName}}</display-name>
</web-app>`
            }
        ]
    }
];

export function getAppTemplates(): AppTemplate[] {
    return templates;
}

export function getTemplateById(id: AppTemplateId): AppTemplate | undefined {
    return templates.find((template) => template.id === id);
}
