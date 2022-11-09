import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as _ from 'lodash';
import { ValidationErrorInterface } from 'src/common/interfaces/validation-error.interface';
import { StatusCodesList } from 'src/common/constants/status-codes-list.constants';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CustomHttpExceptionResponse } from '../exception/custom-http.exception';
import { ExceptionTitleList } from '../constants/exception-title-list.constants';
import { Response } from 'express';

@Catch(HttpException)
export class I18nExceptionFilterPipe implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly i18n: I18nService,
  ) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const r = await this.getResponse(
      request.url,
      exception,
      ctx.getRequest().i18nLang || ctx.getRequest().headers['x-custom-lang'],
    );

    this.logger.error(ctx.getResponse());

    return response.status(exception.getStatus()).json(r);
  }

  getExceptionTitle(code: number): string {
    const keyCode = _.findKey(StatusCodesList, (value) => value === code);
    if (!keyCode) {
      return ExceptionTitleList.InternalServerError;
    }
    return `exception.${ExceptionTitleList[keyCode]}`;
  }

  async getResponse(
    path: string,
    exception: HttpException,
    lang: string,
  ): Promise<CustomHttpExceptionResponse> {
    const exceptionResponse =
      exception.getResponse() as CustomHttpExceptionResponse;

    const title = this.getExceptionTitle(exceptionResponse.code);

    return {
      ...exceptionResponse,
      message: await this.getMessage(title, lang, exceptionResponse.args),
      path: path,
    };
  }

  async getMessage(title: string, lang: string, args: any[]): Promise<string> {
    try {
      return await this.i18n.translate(title, {
        lang,
        args: {
          ...args,
        },
      });
    } catch (error) {
      this.logger.error('Error in I18nExceptionFilterPipe: ', {
        meta: {
          error,
        },
      });
    }
  }

  checkIfConstraintAvailable(message: string): {
    title: string;
    argument: Record<string, any>;
  } {
    try {
      const splitObject = message.split('-');
      if (!splitObject[1]) {
        return {
          title: splitObject[0],
          argument: {},
        };
      }
      return {
        title: splitObject[0],
        argument: JSON.parse(splitObject[1]),
      };
    } catch (e) {
      return {
        title: message,
        argument: {},
      };
    }
  }

  async translateArray(errors: any[], lang: string) {
    const validationData: Array<ValidationErrorInterface> = [];
    for (let i = 0; i < errors.length; i++) {
      const constraintsValidator = [
        'validate',
        'isEqualTo',
        'isIn',
        'matches',
        'maxLength',
        'minLength',
        'isLength',
      ];
      const item = errors[i];
      let message = [];
      if (item.constraints) {
        message = await Promise.all(
          Object.keys(item.constraints).map(async (key: string) => {
            let validationKey: string = key,
              validationArgument: Record<string, any> = {};
            if (constraintsValidator.includes(key)) {
              const { title, argument } = this.checkIfConstraintAvailable(
                item.constraints[key],
              );
              validationKey = title;
              validationArgument = argument;
            }
            const args: Record<string, any> = {
              lang,
              args: {
                property: item.property,
              },
            };
            if (
              validationArgument &&
              Object.keys(validationArgument).length > 0
            ) {
              args.args = {
                ...validationArgument,
                property: item.property,
              };
            }
            return this.i18n.translate(`validation.${validationKey}`, args);
          }),
        );
      }

      validationData.push({
        name: item.property,
        errors: message,
      });
    }
    return validationData;
  }
}
